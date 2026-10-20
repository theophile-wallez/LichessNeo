import { afterEach, expect, it, vi } from 'vitest';
import { passedFen } from '#page/review/coach/threat.ts';
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
  // The coach's threats are the analysis page's own: positions of the game with the turn passed.
  const threats = new Set(ctrl.mainline.map(node => passedFen(node.fen)));
  let searches = 0;
  useFakeEngine(ctrl, search => {
    if (!threats.has(search.fen)) searches++;
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
  const key = `ln-ext-review:${GAME.id}:${ctrl.mainline.length}:v2`;
  expect(finished.treeParts).toHaveLength(ctrl.mainline.length);
  expect(localStorage.getItem(key)).not.toBeNull();

  searches = 0;
  review.start();
  await advance(1000);
  expect(searches).toBe(0);
  const panel = document.querySelector('#ln-ext-review');
  expect(panel?.querySelector('.ln-ext-summary-pct')).toBeNull();
  expect(panel?.querySelector('.ln-ext-review__top .ln-ext-acc--w')?.textContent).toMatch(
    /^\d{1,3}\.\d$/,
  );
});
