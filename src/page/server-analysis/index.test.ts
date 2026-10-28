import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { fakeLayout } from '#shared/testing/layout.ts';
import {
  fakeController,
  type FakeController,
  withFakeSite,
} from '#page/review/fixtures/fake-lichess.ts';
import { fixtureGames } from '#page/review/fixtures/replay.ts';
import { serverAnalysisCard } from './index.ts';

// A game's analysis page as Lichess serves it before any analysis: the move
// list in the tools, the request's form in the underboard. The card's check
// runs every 250 ms and can't be stopped: this file has its window to itself.

const [game] = fixtureGames();
if (!game) throw new Error('no fixture game');

const PAGE = `<main class="analyse"><div class="analyse__tools"><div class="analyse__moves areplay"><div><div class="tview2 tview2-column"></div></div></div></div>
<div class="analyse__underboard"><div class="analyse__underboard__panels"><div class="computer-analysis active">
<form method="post" class="future-game-analysis" action="/game/x/request-analysis"><button type="submit" class="button text"><span class="is3 text">Demander une analyse par le serveur</span></button></form>
</div></div></div></main>`;

const SIDE = { inaccuracy: 2, mistake: 0, blunder: 3, acpl: 41, accuracy: 84 };

let ctrl: FakeController;
let requests = 0;
let full = false;

const card = (): HTMLElement | null =>
  queryOne(document, '.analyse__moves > .ln-ext-sanalysis', HTMLElement);
const tick = (): void => {
  vi.advanceTimersByTime(300);
};

beforeEach(() => {
  fakeLayout(() => 400);
});

beforeAll(() => {
  vi.useFakeTimers();
  history.pushState({}, '', `/game/${game.id}`);
  document.body.innerHTML = PAGE;
  queryOne(document, 'form', HTMLFormElement)?.addEventListener('submit', event => {
    event.preventDefault();
    requests++;
  });
  ctrl = fakeController({
    id: game.id,
    positions: game.nodes,
    players: [
      { color: 'white', user: { username: 'Alice' } },
      { color: 'black', user: { username: 'Bob' } },
    ],
  });
  ctrl.hasFullComputerAnalysis = () => full;
  withFakeSite(ctrl);
  serverAnalysisCard.start();
});

afterAll(() => {
  vi.useRealTimers();
});

it('offers Lichess’s request at the end of the moves, under its own label', () => {
  tick();
  expect(card()?.dataset.lnExtState).toBe('request');
  const button = queryOne(card() ?? document, '[data-ln-ext-server="request"]', HTMLElement);
  expect(button?.textContent).toBe('Demander une analyse par le serveur');
  button?.click();
  expect(requests).toBe(1);
});

it('follows the analysis as its scores come in, drawing them', () => {
  // Lichess's script swaps its chart in for the form, then the scores come in.
  const panel = queryOne(document, '.computer-analysis', HTMLElement);
  if (panel) panel.innerHTML = '<div id="acpl-chart-container"><canvas></canvas></div>';
  const half = Math.floor(ctrl.mainline.length / 2);
  for (const node of ctrl.mainline.slice(0, half)) Object.assign(node, { eval: { cp: 20 } });
  tick();
  expect(card()?.dataset.lnExtState).toBe('running');
  const share = Math.round((half / ctrl.mainline.length) * 100);
  expect(
    queryOne(card() ?? document, '.ln-ext-sanalysis__status', HTMLElement)?.textContent,
  ).toContain(`${share}`);
  expect(queryOne(card() ?? document, '.ln-ext-gchart__line', Element)).not.toBeNull();
});

it('shows each side’s errors once it’s in, and starts the exercise on them', () => {
  for (const node of ctrl.mainline) Object.assign(node, { eval: { cp: 20 } });
  ctrl.data = {
    ...ctrl.data,
    analysis: { white: SIDE, black: { ...SIDE, blunder: 1, accuracy: 70 } },
  };
  full = true;
  tick();
  expect(card()?.dataset.lnExtState).toBe('done');
  const names = queryAll(card() ?? document, '.ln-ext-sanalysis__name', HTMLElement).map(
    name => name.textContent,
  );
  expect(names).toEqual(['Alice', 'Bob']);
  const counts = queryAll(card() ?? document, '.ln-ext-sanalysis__count', HTMLElement);
  expect(counts.map(count => count.textContent)).toEqual(['2?!', '0?', '3??', '2?!', '0?', '1??']);
  expect(counts[1]?.classList.contains('ln-ext-sanalysis__count--none')).toBe(true);
  queryOne(card() ?? document, '[data-ln-ext-server="learn"]', HTMLElement)?.click();
  expect(ctrl.retro).toBeTruthy();
});

it('keeps its card at the list’s end when Lichess draws the list anew', () => {
  const moves = queryOne(document, '.analyse__moves', HTMLElement);
  moves?.replaceChildren(document.createElement('div'));
  tick();
  expect(card()?.dataset.lnExtState).toBe('done');
  expect(moves?.lastElementChild).toBe(card());
});
