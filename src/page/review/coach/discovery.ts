import type { Board, Square } from '#shared/chess/index.ts';
import type { Mark } from '#page/board/review-arrows.ts';
import { batteryOf } from '#page/review/chess/rays.ts';
import type { Plan } from './idea.ts';

// A discovery set up: the piece moved lines up behind one of its own on the
// other side's king, or queen, and the piece in front has only to move.

/** The battery the slider moved to `to` makes, if it wasn't there before. */
export function discoveryOf(
  before: Board,
  after: Board,
  [from, to]: [Square, Square],
): Plan | null {
  const battery = batteryOf(after, to);
  const slider = after.get(to);
  if (!battery || !slider) return null;
  const was = batteryOf(before, from);
  if (was?.screen === battery.screen && was.target === battery.target) return null;
  const screen = after.get(battery.screen);
  const target = after.get(battery.target);
  return screen && target ? { kind: 'discovery', slider, screen, target } : null;
}

/**
 * The slider's line through the piece in front to its target, that piece
 * ringed unless it has left the board shown, as after a move not played.
 */
export function discoveryMarks(after: Board, to: Square, shown: Board): Mark[] | null {
  const battery = batteryOf(after, to);
  if (!battery) return null;
  const { screen, target } = battery;
  const [piece, now] = [after.get(screen), shown.get(screen)];
  const stays = piece?.role === now?.role && piece?.color === now?.color;
  const screenRing: Mark[] = stays ? [{ kind: 'ring', square: screen, tone: 'plan' }] : [];
  return [
    { kind: 'link', from: to, to: target, tone: 'attack' },
    ...screenRing,
    { kind: 'ring', square: target, tone: 'attack' },
  ];
}
