import { isSquare, type Square } from '#shared/chess/index.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { ENGINE_COLOR, REVIEW_COLOR, THREAT_COLOR } from '#shared/board/colors.ts';
import { drawingMarkup } from '#shared/board/drawing.ts';
import { EMPTY_BOARD, occupiedBy, type Occupied, squareCenter } from '#shared/board/geometry.ts';
import { parseFen } from '#shared/chess/fen.ts';
import { arrowPolygons } from '#page/board/render.ts';
import type { Mark, ReviewArrow } from '#shared/board/marks.ts';
import { normalizeUci } from '#page/review/chess/notation.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { badgeMarkup, landingCell, reviewArrowsFor } from '#page/review/view/board-badge.ts';
import { burstMarkup } from '#page/review/view/brilliant-burst.ts';
import { squareStyle } from './board.ts';
import { fenAfter } from './explain.ts';

// What the demo draws around the pieces for the move on the board, with the
// extension's own code (page/board, page/review/view/board-badge.ts): under
// them, the move's squares and the coach's drawing of its comment; over them,
// the best move's arrow and the reply an error lets in, and the class's badge
// (a brilliant move's burst under it).

/** A move on the board: the game's, the engine's best, a line's or one tried. */
export interface Shown {
  readonly uci: string;
  readonly san: string;
  /** The position it's played from. */
  readonly fen: string;
  /** Its verdict, for its squares' color and its badge; none for a line's move. */
  readonly moveClass: MoveClass | null;
  /** The arrows: the move that was best, and the reply it lets in. */
  readonly best: string | null;
  readonly threat: string | null;
}

export const shownOf = (move: MoveVerdict): Shown => ({
  uci: move.uci,
  san: move.san,
  fen: move.previousPosition.fen,
  moveClass: move.moveClass,
  best: move.best,
  threat: move.after.best,
});

const BRUSH_COLORS: Readonly<Record<ReviewArrow['brush'], string>> = {
  best: REVIEW_COLOR,
  threat: THREAT_COLOR,
  engine: ENGINE_COLOR,
};

/** The move's squares in the engine's terms: castling as the king's two steps. */
function squaresOf(move: Shown): [Square, Square] | null {
  const uci = normalizeUci(move.uci, move.fen, false);
  const [from, to] = [uci.slice(0, 2), uci.slice(2, 4)];
  return isSquare(from) && isSquare(to) ? [from, to] : null;
}

// The pieces on the board once the move is played, which a knight's lines go round.
const occupiedAfter = (move: Shown | null): Occupied =>
  move ? occupiedBy(parseFen(fenAfter(move.fen, [move.uci])).board.keys(), true) : EMPTY_BOARD;

/** The move's squares, the square picked while retrying, and the coach's drawing. */
export function underMarkup(
  move: Shown | null,
  drawing: readonly Mark[],
  picked: Square | null = null,
): SafeHtml {
  const squares = move ? squaresOf(move) : null;
  const last = (squares ?? []).map(
    square =>
      html`<i class="demo-last" data-class="${move?.moveClass ?? ''}" style="${squareStyle(square)}"></i>`,
  );
  const pick = picked
    ? html`<i class="demo-last demo-last--picked" style="${squareStyle(picked)}"></i>`
    : '';
  return html`${last}${pick}<svg class="demo-shapes" viewBox="0 0 8 8" aria-hidden="true">${drawingMarkup(drawing, true, occupiedAfter(move))}</svg>`;
}

/** The arrows and the badge; `drawing` is the coach's, whose reply an inaccuracy's arrow needs. */
export function overMarkup(move: Shown | null, drawing: readonly Mark[] = []): SafeHtml {
  const { moveClass } = move ?? {};
  if (!move || !moveClass) return html``;
  const arrows = reviewArrowsFor({
    moveClass,
    best: move.best,
    threat: move.threat,
    drawing,
    engine: null,
  }).map(({ orig, dest, brush }) => ({
    from: squareCenter(orig, true),
    to: squareCenter(dest, true),
    color: BRUSH_COLORS[brush],
    opacity: 0.8,
  }));
  const square = { uci: move.uci, san: move.san, orientation: 'white' } as const;
  // A brilliant move bursts under its badge, as on the review's board (view/board.ts).
  const burst = moveClass === 'brilliant' ? burstMarkup(landingCell(square)) : null;
  const badge = badgeMarkup({ moveClass, ...square });
  return html`<svg class="demo-shapes" viewBox="0 0 8 8" aria-hidden="true">${arrowPolygons(arrows, occupiedAfter(move))}</svg>${burst}${badge}`;
}
