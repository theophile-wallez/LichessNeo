import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod/mini';
import { SquareSchema } from '#shared/testing/square-schema.ts';
import { squareCoords } from '#shared/chess/squares.ts';
import type { Color, Square } from '#shared/chess/types.ts';
import { queryOne } from '#shared/dom.ts';
import { SOUND_NAMES } from '#shared/sounds.ts';
import { watchMoveAttempts } from './attempts.ts';
import { addSquare, ColorSchema, renderBoard } from '#shared/testing/boards.ts';
import { fakeSoundPlayer } from './fixtures/sound-player.ts';
import { hookSoundPlayer } from './player.ts';
import { squareFromPoint } from './pointer-square.ts';
import { createSession } from './session.ts';
// What the original played for each attempt, and which square it read under the pointer.
import legacyAttempts from './fixtures/legacy-attempts.json' with { type: 'json' };
import legacySquares from './fixtures/legacy-pointer-squares.json' with { type: 'json' };

const SpotSchema = z.union([SquareSchema, z.tuple([z.number(), z.number()])]);

const AttemptSchema = z.object({
  name: z.string(),
  placement: z.string(),
  orientation: ColorSchema,
  selected: z.optional(SquareSchema),
  premoves: z.optional(z.array(SquareSchema)),
  steps: z.array(
    z.object({
      down: z.optional(SpotSchema),
      up: z.optional(SpotSchema),
      button: z.optional(z.number()),
      target: z.optional(z.literal('outside')),
      drag: z.optional(z.boolean()),
      premove: z.optional(z.array(SquareSchema)),
      moveSound: z.optional(z.unknown()),
      board: z.optional(z.string()),
    }),
  ),
  calls: z.array(z.unknown()),
});

const SquaresSchema = z.object({
  rect: z.object({ left: z.number(), top: z.number(), width: z.number(), height: z.number() }),
  cases: z.array(
    z.object({
      orientation: ColorSchema,
      x: z.number(),
      y: z.number(),
      square: z.nullable(SquareSchema),
    }),
  ),
});

const attempts = z.array(AttemptSchema).parse(legacyAttempts);
const pointerSquares = SquaresSchema.parse(legacySquares);

// The 400px board the original was recorded on, at (100, 50).
const RECT = new DOMRect(100, 50, 400, 400);

function placeBoard(board: Element): Element {
  vi.spyOn(board, 'getBoundingClientRect').mockReturnValue(RECT);
  return board;
}

// The center of a square as shown.
function pointAt(
  spot: Square | readonly [number, number],
  orientation: Color,
): readonly [number, number] {
  if (typeof spot !== 'string') return spot;
  const [file, rank] = squareCoords(spot);
  const column = orientation === 'white' ? file : 7 - file;
  const row = orientation === 'white' ? 7 - rank : rank;
  return [RECT.left + column * 50 + 25, RECT.top + row * 50 + 25];
}

function press(
  type: string,
  [x, y]: readonly [number, number],
  target: Element,
  button: number,
): void {
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, button, clientX: x, clientY: y }));
}

let stop = (): void => {};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'Date'] });
});

afterEach(() => {
  stop();
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('move attempts', () => {
  it.each(attempts)('$name: plays what the original played', async attempt => {
    const { sound, calls } = fakeSoundPlayer();
    const session = createSession();
    hookSoundPlayer(sound, new Map(SOUND_NAMES.map(name => [name, [`blob:${name}`]])), session);
    stop = watchMoveAttempts(session);
    let board = placeBoard(renderBoard(attempt));
    for (const step of attempt.steps) {
      const outside = queryOne(document, '.outside', Element);
      const target = step.target === 'outside' && outside ? outside : board;
      const button = step.button ?? 0;
      if (step.down) press('pointerdown', pointAt(step.down, attempt.orientation), target, button);
      if (step.drag)
        board.append(
          Object.assign(document.createElement('piece'), { className: 'white pawn dragging' }),
        );
      if (step.up) press('pointerup', pointAt(step.up, attempt.orientation), target, button);
      for (const key of step.premove ?? []) addSquare(board, 'current-premove', key);
      if (step.board) {
        const placement = step.board;
        board = placeBoard(
          renderBoard({ placement, orientation: attempt.orientation, lastMove: ['e7', 'e8'] }),
        );
      }
      if (step.moveSound !== undefined) sound.move(step.moveSound);
      await vi.advanceTimersByTimeAsync(150);
    }
    expect(JSON.parse(JSON.stringify(calls))).toEqual(attempt.calls);
  });

  it('stays silent in the board editor, where a piece goes anywhere', async () => {
    const { sound, calls } = fakeSoundPlayer();
    const session = createSession();
    hookSoundPlayer(sound, new Map(SOUND_NAMES.map(name => [name, [`blob:${name}`]])), session);
    stop = watchMoveAttempts(session);
    const board = placeBoard(
      renderBoard({ placement: '4k3/8/8/8/8/8/4P3/4K3', orientation: 'white' }),
    );
    board.closest('.main-board')?.parentElement?.classList.add('board-editor');
    press('pointerdown', pointAt('e2', 'white'), board, 0);
    board.append(
      Object.assign(document.createElement('piece'), { className: 'white pawn dragging' }),
    );
    press('pointerup', pointAt('e5', 'white'), board, 0);
    await vi.advanceTimersByTimeAsync(150);
    expect(calls).toEqual([]);
  });

  it('keeps the pressed position, even before our sounds are in', async () => {
    const session = createSession();
    stop = watchMoveAttempts(session);
    const board = placeBoard(
      renderBoard({ placement: '4k3/8/8/8/8/8/4P3/4K3', orientation: 'white', selected: 'e2' }),
    );
    press('pointerdown', pointAt('e4', 'white'), board, 0);
    addSquare(board, 'current-premove', 'e4');
    await vi.advanceTimersByTimeAsync(150);
    expect(session.lastPieces?.size).toBe(3);
  });

  // Chessground hides a selection's mark once the piece is let go, and keeps it to reuse.
  it.each([
    { selection: 'shown', display: '', played: [['play', 'ln-ext-premove', undefined]] },
    { selection: 'hidden', display: 'none', played: [] },
  ])('takes a click for a move only with a selection $selection', async ({ display, played }) => {
    const { sound, calls } = fakeSoundPlayer();
    const session = createSession();
    hookSoundPlayer(sound, new Map(SOUND_NAMES.map(name => [name, [`blob:${name}`]])), session);
    stop = watchMoveAttempts(session);
    const board = placeBoard(
      renderBoard({ placement: '4k3/8/8/8/8/8/4P3/4K3', orientation: 'white', selected: 'e2' }),
    );
    const selection = queryOne(board, 'square.selected', HTMLElement);
    selection?.style.setProperty('display', display);
    press('pointerdown', pointAt('e4', 'white'), board, 0);
    addSquare(board, 'current-premove', 'e4');
    await vi.advanceTimersByTimeAsync(150);
    expect(calls).toEqual(played);
  });
});

describe('squareFromPoint', () => {
  it.each(pointerSquares.cases)(
    'reads $square at ($x, $y), $orientation at the bottom, as the original did',
    ({ orientation, x, y, square }) => {
      expect(squareFromPoint({ rect: pointerSquares.rect, x, y, orientation })).toBe(square);
    },
  );

  it('finds no square on a board with no size', () => {
    const rect = { left: 0, top: 0, width: 0, height: 0 };
    expect(squareFromPoint({ rect, x: 0, y: 0, orientation: 'white' })).toBeNull();
  });
});
