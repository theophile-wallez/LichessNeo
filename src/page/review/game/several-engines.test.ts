import { afterEach, expect, it, vi } from 'vitest';
import { uciPosition } from '#page/review/engine/position.ts';
import { SCRIPT_DELAY, setUp, useFakeEngine } from '#page/review/fixtures/review-script.ts';
import { review } from '#page/review/index.ts';

// A started review can't be stopped: this file has its window to itself.

/** The moves a `position` argument gives after its FEN. */
const movesOf = (position: string): readonly string[] =>
  position.split(' moves ')[1]?.split(' ') ?? [];

const equal = (one: readonly string[], other: readonly string[] | undefined): boolean =>
  other !== undefined && one.join(' ') === other.join(' ');

afterEach(() => {
  vi.useRealTimers();
});

it('analyzes a game with several engines at once, each position once, with its moves', async () => {
  const { ctrl, advance } = setUp({ game: 'passant', lang: 'en', cached: false, steps: [] });
  vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(8);
  const deep = new Map<string, readonly string[]>();
  let repeated = false;
  useFakeEngine(ctrl, search => {
    if (search.depth >= 16) {
      repeated ||= deep.has(search.fen);
      deep.set(search.fen, search.moves);
    }
    return SCRIPT_DELAY(search);
  });
  review.start();
  // One engine takes 30 ms and 150 ms per position: 4.5 s for this game's 25.
  await advance(2500);
  const nodes = ctrl.mainline;
  expect(localStorage.getItem(`lr-ext-review:passanta:${nodes.length}:v1`)).not.toBeNull();
  expect(repeated).toBe(false);
  // Each position searched goes with the moves since its last irreversible one.
  const expected = new Map(
    nodes.map((node, i) => [node.fen, movesOf(uciPosition(nodes.slice(0, i + 1), false))]),
  );
  expect([...deep].every(([fen, moves]) => equal(moves, expected.get(fen)))).toBe(true);
  expect([...deep.values()].some(moves => moves.length > 0)).toBe(true);
});
