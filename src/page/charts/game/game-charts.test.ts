import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { fakeLayout } from '#shared/testing/layout.ts';
import {
  fakeController,
  type FakeController,
  withFakeSite,
} from '#page/review/fixtures/fake-lichess.ts';
import { fixtureGames } from '#page/review/fixtures/replay.ts';
import { gameCharts } from './index.ts';

// A game's analysis page, its tools open on the charts, with Lichess's chart
// containers as it draws them. The charts' check runs every 250 ms and can't
// be stopped: this file has its window to itself, and one page.

const [game] = fixtureGames();
if (!game) throw new Error('no fixture game');

const UNDERBOARD = `<main class="analyse"><div class="analyse__underboard"><div class="analyse__underboard__panels">
  <div class="computer-analysis active"><div id="acpl-chart-container"><canvas id="acpl-chart"></canvas></div></div>
  <div class="move-times"><div id="movetimes-chart-container"><canvas id="movetimes-chart"></canvas><div class="game-duration">Duration 05:17</div></div></div>
</div></div></main>`;

let ctrl: FakeController;

/** The server analysis of the first `count` positions. */
function analyse(count: number): void {
  for (const [i, node] of ctrl.mainline.entries())
    if (i < count)
      Object.assign(node, { eval: { cp: (i % 5) * 40 - 80 }, clock: 18_000 - i * 100 });
}

/** The middle of a move's column on the move times. */
function columnX(ply: number): number {
  const column = queryOne(
    document,
    `#movetimes-chart-container [data-ln-ext-ply="${ply}"]`,
    Element,
  );
  return Number(column?.getAttribute('x')) + Number(column?.getAttribute('width')) / 2;
}

const chartOf = (container: string): HTMLElement | null =>
  queryOne(document, `${container} .ln-ext-gchart`, HTMLElement);

// Spies are restored before each test (vitest.config.ts): the layout is faked for each.
beforeEach(() => {
  fakeLayout(() => 400);
});

beforeAll(() => {
  vi.useFakeTimers();
  history.pushState({}, '', `/game/${game.id}`);
  document.body.innerHTML = UNDERBOARD;
  ctrl = fakeController({ id: game.id, positions: game.nodes });
  ctrl.data = {
    ...ctrl.data,
    game: {
      id: game.id,
      speed: 'blitz',
      variant: { key: 'standard' },
      moveCentis: ctrl.mainline.slice(1).map((_, i) => 100 + i * 50),
      division: { middle: 6, end: 14 },
    },
  };
  // The clocks come with the game, the server analysis later.
  for (const [i, node] of ctrl.mainline.entries()) Object.assign(node, { clock: 18_000 - i * 100 });
  withFakeSite(ctrl);
  gameCharts.start();
});

afterAll(() => {
  vi.useRealTimers();
});

it('waits for the server analysis, then draws it over Lichess’s hidden canvas', () => {
  vi.advanceTimersByTime(300);
  expect(chartOf('#acpl-chart-container')).toBeNull();
  analyse(10);
  vi.advanceTimersByTime(300);
  const container = queryOne(document, '#acpl-chart-container', HTMLElement);
  expect(container?.classList.contains('ln-ext-gchart-on')).toBe(true);
  const line = queryOne(document, '#acpl-chart-container .ln-ext-gchart__line', Element);
  const partial = line?.getAttribute('d');
  expect(partial).toMatch(/^M[\d.]+,[\d.]+C/);
  // The rest of the analysis comes in.
  analyse(ctrl.mainline.length);
  vi.advanceTimersByTime(300);
  const whole = queryOne(document, '#acpl-chart-container .ln-ext-gchart__line', Element);
  expect(whole?.getAttribute('d')).not.toBe(partial);
});

it('draws a column per move, White’s and Black’s, with the phases named', () => {
  const chart = chartOf('#movetimes-chart-container');
  expect(queryAll(chart ?? document, '.ln-ext-gchart__bar--white', Element)).toHaveLength(
    Math.ceil((ctrl.mainline.length - 1) / 2),
  );
  const names = queryAll(chart ?? document, '.ln-ext-gchart__phase-name', Element).map(
    name => name.textContent,
  );
  expect(names).toEqual(['Middlegame', 'Endgame']);
});

it('marks the move on the board, and goes to the move clicked', () => {
  ctrl.jumpToMain(3);
  vi.advanceTimersByTime(300);
  const marker = queryOne(document, '#acpl-chart-container .ln-ext-gchart__ply', Element);
  expect(marker?.classList.contains('ln-ext-gchart__ply--on')).toBe(true);
  const svg = queryOne(document, '#movetimes-chart-container svg', SVGSVGElement);
  svg?.dispatchEvent(new MouseEvent('click', { clientX: columnX(6), bubbles: true }));
  expect(ctrl.node.ply).toBe(6);
});

it('names the move under the pointer, with its time and clock', () => {
  vi.advanceTimersByTime(300);
  const svg = queryOne(document, '#movetimes-chart-container svg', SVGSVGElement);
  svg?.dispatchEvent(new MouseEvent('pointermove', { clientX: columnX(6), bubbles: true }));
  const tip = queryOne(document, '#movetimes-chart-container .ln-ext-rchart__tip', HTMLElement);
  expect(tip?.textContent).toContain('3... ');
  expect(tip?.textContent).toContain('Clock');
});
