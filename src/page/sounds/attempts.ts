import type { Board, Square } from '#shared/chess/types.ts';
import {
  boardOrientation,
  mainBoardWrap,
  mainCgBoard,
  markedSquares,
  readBoard,
} from './board-reader.ts';
import { squareFromPoint } from './pointer-square.ts';
import type { SoundSession } from './session.ts';

// Chessground plays nothing when a premove is queued or a dropped piece is
// refused. So after a click or a drop that tries to move a piece, either a
// move sound played, a premove appeared, or the move was refused. A refused
// click stays silent: it's how a piece is deselected.

// Chessground defers its move callback and redraws on the next frame.
const SETTLE_MS = 80;

interface Press {
  readonly board: Element;
  readonly square: Square;
  readonly premoves: string;
}

const premoveKey = (board: Element): string => markedSquares(board, 'current-premove').join();

function squareUnderPointer(board: Element, event: PointerEvent): Square | null {
  const rect = board.getBoundingClientRect();
  const { clientX: x, clientY: y } = event;
  return squareFromPoint({ rect, x, y, orientation: boardOrientation() });
}

function watchAttempt(session: SoundSession, press: Press, isDrop: boolean): void {
  const startedAt = Date.now();
  setTimeout(() => {
    if (!session.playOurs || session.lastMoveSoundAt >= startedAt) return;
    const premoves = premoveKey(press.board);
    if (premoves && premoves !== press.premoves) session.playOurs('premove');
    else if (isDrop) session.playOurs('illegal');
  }, SETTLE_MS);
}

// Click-to-move: a piece is selected, and this click isn't on it or on
// another piece of its side.
function isClickToMove(board: Element, pieces: Board, square: Square): boolean {
  const [selected] = markedSquares(board, 'selected');
  const piece = selected ? pieces.get(selected) : undefined;
  return piece !== undefined && square !== selected && pieces.get(square)?.color !== piece.color;
}

function onPress(session: SoundSession, event: PointerEvent): Press | null {
  const board = mainCgBoard();
  const onBoard = event.target instanceof Node && board?.contains(event.target);
  // The board editor places pieces without rules or sounds: nothing there is refused.
  if (event.button !== 0 || !board || !onBoard || board.closest('.board-editor')) return null;
  const state = readBoard(mainBoardWrap());
  const square = squareUnderPointer(board, event);
  if (!state || !square) return null;
  session.lastPieces = state.pieces;
  const press: Press = { board, square, premoves: premoveKey(board) };
  if (isClickToMove(board, state.pieces, square)) watchAttempt(session, press, false);
  return press;
}

/** Listens to the pointer until the returned function is called. */
export function watchMoveAttempts(session: SoundSession): () => void {
  let press: Press | null = null;
  const onPointerDown = (event: PointerEvent): void => {
    press = onPress(session, event);
  };
  // Runs before chessground's own handler, while the drag is still on.
  const onPointerUp = (event: PointerEvent): void => {
    const released = press;
    press = null;
    if (!released || event.button !== 0 || !released.board.querySelector('piece.dragging')) return;
    const square = squareUnderPointer(released.board, event);
    // Dropped back on its square or off the board: a cancelled drag.
    if (square && square !== released.square) watchAttempt(session, released, true);
  };
  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('pointerup', onPointerUp, true);
  return () => {
    window.removeEventListener('pointerdown', onPointerDown, true);
    window.removeEventListener('pointerup', onPointerUp, true);
  };
}
