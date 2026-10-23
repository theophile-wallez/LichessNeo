import type { Color } from '#shared/chess/types.ts';
import { setStyleProperty } from '#shared/dom.ts';
import { barLabel } from '#page/review/evaluation/format.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import type { ReviewElements } from './elements.ts';

// The eval bar beside the board: White's winning chances, its score at the end.

export interface BarInput {
  readonly review: { readonly positions: readonly (PositionRecord | null)[] } | null;
  /** The panel is open (any mode but the closed one). */
  readonly reviewing: boolean;
  readonly live: boolean;
  /** The position on the board is one of the game's own (game/work.ts). */
  readonly onGame: boolean;
  readonly ply: number;
  /** The position before the best move shown on the board, if one is. */
  readonly bestBefore: PositionRecord | null;
  /** The engine's record of the position on the board, off the game. */
  readonly offGame: PositionRecord | undefined;
  /** What the bar last showed during the review. */
  readonly last: PositionRecord | null;
}

function knownPosition(input: BarInput): PositionRecord | null {
  const { review, reviewing, onGame, ply, bestBefore, offGame } = input;
  if (input.live || !review) return null;
  // The best move keeps the eval of the position before it.
  if (bestBefore) return bestBefore;
  if (onGame) return review.positions[ply] ?? null;
  return reviewing ? (offGame ?? null) : null;
}

/**
 * What the bar shows. The free board keeps Lichess's own bar. A move played
 * off the game waits a moment for the engine: the bar holds its last score
 * meanwhile, rather than vanish and shift the board over by its width.
 */
export function barPosition(input: BarInput): PositionRecord | null {
  const known = knownPosition(input);
  if (!known && input.reviewing && !input.live && input.review) return input.last;
  return known;
}

export function drawBar(
  elements: ReviewElements,
  position: PositionRecord,
  orientation: Color,
): void {
  const { bar, barFill, barLabel: label } = elements;
  bar.classList.toggle('ln-ext-evalbar--flip', orientation === 'black');
  setStyleProperty(barFill, '--ln-ext-bar-white', `${position.whiteWinChance}%`);
  const text = barLabel(position);
  if (label.textContent !== text) label.textContent = text;
  const side = position.whiteWinChance >= 50 ? 'white' : 'black';
  const className = `ln-ext-evalbar__label ln-ext-evalbar__label--${side}`;
  if (label.className !== className) label.className = className;
}
