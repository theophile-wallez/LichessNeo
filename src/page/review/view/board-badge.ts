import { parseSquare } from '#shared/chess/squares.ts';
import type { Color } from '#shared/chess/types.ts';
import type { Point } from '#shared/geometry.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { squareOnScreen } from '#page/board/geometry.ts';
import type { ReviewArrow } from '#page/board/review-arrows.ts';
import { GOOD, type MoveClass } from '#page/review/classes/classes.ts';
import { classSvg } from '#page/review/classes/icon-svg.ts';

// The verdict's badge on the board, at the top right of the square the
// piece went to, and the arrows the review draws.

export interface BadgeInput {
  readonly moveClass: MoveClass;
  /** The move that led to the board's position, in Lichess's notation. */
  readonly uci: string;
  readonly san: string;
  readonly orientation: Color;
}

/** Where the piece landed: the king's square for a castle, which Lichess writes as king takes rook. */
export function landingSquare(uci: string, san: string): string {
  if (!san.startsWith('O-O')) return uci.slice(2, 4);
  return (san.startsWith('O-O-O') ? 'c' : 'g') + uci.charAt(1);
}

function badgeCell(square: string, orientation: Color): Point {
  const parsed = parseSquare(square);
  const whiteAtBottom = orientation === 'white';
  if (parsed) return squareOnScreen(parsed, whiteAtBottom);
  // No square to land on: where the original's file -1 and rank NaN put it.
  return whiteAtBottom ? [-1, Number.NaN] : [8, Number.NaN];
}

export function badgeMarkup({ moveClass, uci, san, orientation }: BadgeInput): SafeHtml {
  const [column, row] = badgeCell(landingSquare(uci, san), orientation);
  const style = `left:${(column + 1) * 12.5}%;top:${row * 12.5}%`;
  return html`<div class="cdc-badge" style="${style}">${classSvg(moveClass)}</div>`;
}

/** A move's arrow, in the engine's notation; none for a move it can't read. */
export function arrow(uci: string, brush: ReviewArrow['brush']): ReviewArrow[] {
  const orig = parseSquare(uci.slice(0, 2));
  const dest = parseSquare(uci.slice(2, 4));
  return orig && dest ? [{ orig, dest, brush }] : [];
}

export interface ArrowsInput {
  /** The verdict on the board, if any. */
  readonly moveClass: MoveClass | null;
  /** The engine's best move instead of the one played. */
  readonly best: string | null;
  /** The reply that punishes a mistake or a blunder. */
  readonly threat: string | null;
  /** The engine's move from the position on the board, off the game's moves. */
  readonly engine: string | null;
}

const THREATENED: ReadonlySet<MoveClass> = new Set<MoveClass>(['mistake', 'blunder']);

/**
 * The best move when the one played needed a correction, the reply that
 * punishes an error, and the engine's move off the game.
 */
export function reviewArrowsFor({ moveClass, best, threat, engine }: ArrowsInput): ReviewArrow[] {
  const arrows = moveClass && best && !GOOD.has(moveClass) ? arrow(best, 'best') : [];
  if (moveClass && threat && THREATENED.has(moveClass)) arrows.push(...arrow(threat, 'threat'));
  if (engine) arrows.push(...arrow(engine, 'engine'));
  return arrows;
}
