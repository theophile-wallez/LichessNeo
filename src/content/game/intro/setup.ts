import type { Role } from '#shared/chess/types.ts';
import { createElement, setStyleProperty } from '#shared/dom.ts';
import { timePieces } from './pieces.ts';
import { ring, type Intro, type Stage } from './stage.ts';

// The setup: the board is laid out before the player's eyes. Its squares pop
// up from the middle out, the pawns drop in a wave across the files, then the
// back ranks from the rooks in to the kings, which a ring hails. The pieces
// are the board's own, in the set it shows (pieces.ts, styles/game/intro/setup.css).

// When each role of the back ranks drops, in steps: the rooks first, the kings last.
const BACK_RANK: Readonly<Record<Exclude<Role, 'pawn'>, number>> = {
  rook: 0,
  knight: 1,
  bishop: 2,
  queen: 3,
  king: 4,
};

const RANKS = 8;

/** The squares, ours, each a window on the board's own drawing (cg-board::before). */
function addSquares(stage: Stage): void {
  const container = stage.board.parentElement;
  if (!container) return;
  const squares = createElement('div', { className: 'ln-ext-intro-squares' });
  const drawing = getComputedStyle(stage.board, '::before');
  setStyleProperty(squares, '--ln-ext-intro-board-image', drawing.backgroundImage);
  setStyleProperty(squares, '--ln-ext-intro-board-size', drawing.backgroundSize);
  setStyleProperty(squares, '--ln-ext-intro-board-position', drawing.backgroundPosition);
  setStyleProperty(squares, '--ln-ext-intro-board-repeat', drawing.backgroundRepeat);
  // Lichess's brightness and hue settings, on its own boards.
  setStyleProperty(squares, '--ln-ext-intro-board-filter', drawing.filter);
  for (let y = 0; y < RANKS; y++)
    for (let x = 0; x < RANKS; x++) {
      const square = createElement('i', { className: 'ln-ext-intro-squares__square' });
      square.append(createElement('i'));
      setStyleProperty(square, '--ln-ext-intro-x', String(x));
      setStyleProperty(square, '--ln-ext-intro-y', String(y));
      const distance = Math.hypot(x - 3.5, y - 3.5);
      setStyleProperty(square, '--ln-ext-intro-delay', `${Math.round(40 + distance * 70)}ms`);
      squares.append(square);
    }
  // First in the container, as page/backlit's canvas: over the board, under the pieces.
  container.prepend(squares);
  stage.onEnd(() => squares.remove());
}

function dropPieces(stage: Stage): void {
  timePieces(stage, ({ piece, box, x }) => {
    if (piece.role === 'king') ring(stage, box, `king-${piece.color}`);
    return piece.role === 'pawn' ? 600 + x * 45 : 950 + BACK_RANK[piece.role] * 95;
  });
}

function play(stage: Stage): void {
  // A 3D board's pieces stand up from their squares: neither can drop.
  if (!stage.board.closest('.is2d')) return;
  addSquares(stage);
  dropPieces(stage);
}

export const setup: Intro = { ms: 2250, play };
