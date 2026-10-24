import { afterEach, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { fixtureGame, setUp } from '#page/review/fixtures/review-script.ts';
import { roundFinishedGame } from './game-data.ts';
import { onGameEnd } from './index.ts';

// A player's game opened once over: its own page holds all of it, so the card
// comes in at once, without fetching the finished page.

afterEach(() => {
  vi.useRealTimers();
});

const GAME = fixtureGame('passant');

const ownData = (): string =>
  JSON.stringify({
    data: {
      game: { status: { name: 'resign' }, winner: 'white', variant: { key: 'standard' } },
      steps: GAME.nodes.map(node => ({ uci: null, san: null, ...node })),
    },
  });

it('draws the card from the page’s own data, at once', async () => {
  const { advance } = setUp({ game: 'passant', lang: 'en', cached: false, steps: [] });
  const network = globalThis.fetch;
  const asked: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    asked.push(url);
    return network(url);
  });
  document.body.innerHTML =
    '<main class="round"><div class="result-wrap"></div><div class="rcontrols"><div class="follow-up"></div></div></main>';
  const main = queryOne(document, 'main.round', HTMLElement);
  if (!main) throw new Error('no game page');
  const ended = onGameEnd(
    { gameId: GAME.id, color: 'white', live: false },
    main,
    roundFinishedGame(ownData()),
  );
  await Promise.resolve();
  await Promise.resolve();
  expect(document.querySelector('.follow-up > .ln-ext-end__top .ln-ext-end__card')).not.toBeNull();
  await advance(60_000);
  await ended;
  expect(asked).not.toContain(`/${GAME.id}`);
  expect(localStorage.getItem(`ln-ext-review:${GAME.id}:${GAME.nodes.length}:v3`)).not.toBeNull();
});
