import { isAttacked } from '#shared/chess/attacks.ts';
import { type Color, opposite, type Board as Pieces, type Square } from '#shared/chess/types.ts';
import { oncePerFrame } from '#shared/frame.ts';
import { cgKey } from '#page/lichess/chessground.ts';
import { type Landing, lastLanding, readBoard } from '#page/sounds/board-reader.ts';

// The moves a board shows, as chessground marks them: its last-move squares
// change (a move played, or a jump through the game), and the piece lands
// once its slide is over (chessground's `anim` class). Pieces sliding or
// dragged change their style on every frame: those changes are skipped first.

export interface Arrival extends Landing {
  /** A capture or a promotion. */
  readonly strong: boolean;
  /** The king it puts in check. */
  readonly check: Square | null;
}

/** A slide never takes longer than Lichess's slowest; past it, the piece has landed. */
const MAX_SLIDE_MS = 800;

const isPieceStyle = (record: MutationRecord): boolean =>
  record.type === 'attributes' &&
  record.attributeName === 'style' &&
  record.target instanceof Element &&
  record.target.tagName === 'PIECE';

function pieceOn(board: Element, square: Square): Element | null {
  for (const element of board.children)
    if (
      element.tagName === 'PIECE' &&
      cgKey(element) === square &&
      !element.classList.contains('fading')
    )
      return element;
  return null;
}

function isStrong(landing: Landing, before: Pieces): boolean {
  if (before.get(landing.to)?.color === opposite(landing.color)) return true;
  const was = landing.from ? before.get(landing.from) : undefined;
  return was?.role === 'pawn' && landing.role !== 'pawn';
}

// Read off the position, not chessground's `check` square: Lichess's game and
// TV pages leave that mark where the last check was, the king long gone.
function checkedKing(pieces: Pieces, mover: Color): Square | null {
  for (const [square, piece] of pieces)
    if (piece.role === 'king' && piece.color !== mover)
      return isAttacked(pieces, square, mover) ? square : null;
  return null;
}

/** Calls `onArrival` for each move the board shows from now on; returns the stop. */
export function watchMoves(board: Element, onArrival: (arrival: Arrival) => void): () => void {
  const wrap = board.closest('.cg-wrap');
  let state = readBoard(wrap);
  let shown = state?.lastMove.join() ?? '';
  let waiting: { piece: Element; arrival: Arrival; timer: number } | null = null;

  const land = (): void => {
    if (!waiting) return;
    window.clearTimeout(waiting.timer);
    onArrival(waiting.arrival);
    waiting = null;
  };

  const check = oncePerFrame(() => {
    if (waiting && !waiting.piece.classList.contains('anim')) land();
    const next = readBoard(wrap);
    const key = next?.lastMove.join() ?? '';
    if (!next || key === shown) return;
    shown = key;
    const before = state?.pieces ?? new Map();
    state = next;
    const landing = lastLanding(next.pieces, next.lastMove);
    if (!landing) return;
    land();
    const arrival = {
      ...landing,
      strong: isStrong(landing, before),
      check: checkedKing(next.pieces, landing.color),
    };
    const piece = pieceOn(board, landing.to);
    if (piece?.classList.contains('anim'))
      waiting = { piece, arrival, timer: window.setTimeout(land, MAX_SLIDE_MS) };
    else onArrival(arrival);
  });

  const observer = new MutationObserver(records => {
    if (!records.every(isPieceStyle)) check();
  });
  observer.observe(board, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style'],
  });
  return () => {
    observer.disconnect();
    if (waiting) window.clearTimeout(waiting.timer);
    waiting = null;
  };
}
