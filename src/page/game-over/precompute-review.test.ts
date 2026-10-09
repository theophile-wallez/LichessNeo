import { afterEach, expect, it, vi } from 'vitest';
import { bootEngine } from '#page/review/engine-pool.ts';
import {
  fixtureGame,
  SCRIPT_DELAY,
  setUp,
  useFakeEngine,
} from '#page/review/fixtures/review-script.ts';
import { review } from '#page/review/index.ts';
import { readFinishedGame } from './game-data.ts';
import { precomputeReview } from './precompute.ts';

// A started review can't be stopped: this file has its window to itself.

afterEach(() => {
  vi.useRealTimers();
});

const GAME = fixtureGame('passant');

/** The game's finished page, as the game over fetches it once the game ends. */
const finishedPage = (): string =>
  `<script id="page-init-data" type="application/json">${JSON.stringify({
    cfg: {
      data: {
        game: { status: { name: 'resign' }, winner: 'white', variant: { key: 'standard' } },
        treeParts: GAME.nodes,
      },
    },
  })}</script>`;

it('leaves the analysis page a whole review to show, with no search of its own', async () => {
  const { ctrl, advance } = setUp({ game: 'passant', lang: 'en', cached: false, steps: [] });
  let searches = 0;
  useFakeEngine(ctrl, search => {
    searches++;
    return SCRIPT_DELAY(search);
  });
  const finished = readFinishedGame(finishedPage());
  if (!finished) throw new Error('the finished page didn’t read');
  const done = precomputeReview({
    gameId: GAME.id,
    positions: finished.treeParts,
    variant: finished.game.variant.key,
    engine: await bootEngine(false),
    stillOver: () => true,
  });
  await advance(10_000);
  await done;
  expect(searches).toBeGreaterThan(0);
  // The key is the analysis page's: its mainline's length, the start's position counted.
  const key = `lr-ext-review:${GAME.id}:${ctrl.mainline.length}:v1`;
  expect(finished.treeParts).toHaveLength(ctrl.mainline.length);
  expect(localStorage.getItem(key)).not.toBeNull();

  searches = 0;
  review.start();
  await advance(1000);
  expect(searches).toBe(0);
  const panel = document.querySelector('#lr-ext-review');
  expect(panel?.querySelector('.lr-ext-summary-pct')).toBeNull();
  expect(panel?.querySelector('.lr-ext-review__top .lr-ext-acc--w')?.textContent).toMatch(
    /^\d{1,3}\.\d$/,
  );
});
