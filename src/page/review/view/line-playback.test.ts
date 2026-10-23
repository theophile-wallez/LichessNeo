import { afterEach, expect, it, vi } from 'vitest';
import { playUci, someMove } from '#page/review/fixtures/fake-chess.ts';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import { toggleLine } from './navigation.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
  vi.useRealTimers();
});

// The opera game's Rxd7 (ply 25), a mistake: Explain plays Bxf6 and on in its place.
const MISTAKE_PLY = 25;
const STEP_MS = 900;

it('stops playing Explain’s line once the board steps back along it', () => {
  vi.useFakeTimers();
  const { session, ctrl, facade } = judgedGame('opera');
  const move = session.view.review?.moves[MISTAKE_PLY - 1];
  if (!move?.best) throw new Error('that move is no longer an error');
  const line = [move.best];
  for (let fen = move.previousPosition.fen; line.length < 4;) {
    fen = playUci(fen, line.at(-1) ?? '').fen;
    line.push(someMove(fen) ?? '');
  }
  session.lines.found.set(`${move.previousPosition.fen} ${move.best}`, line);
  ctrl.jumpToMain(MISTAKE_PLY);
  toggleLine(session, facade);
  vi.advanceTimersByTime(STEP_MS);
  expect(facade.nodeList.length).toBe(MISTAKE_PLY + 2);
  // A step back: the line's next move would be the other side's, from the wrong position.
  ctrl.userJump(facade.path.slice(0, -2));
  const back = facade.path;
  vi.advanceTimersByTime(STEP_MS * 3);
  expect(facade.path).toBe(back);
  expect(session.view.playing).toBeNull();
});
