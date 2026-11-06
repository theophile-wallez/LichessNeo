import { drawingMarkup } from '#shared/board/drawing.ts';
import type { Mark } from '#shared/board/marks.ts';
import type { DrawingTopic } from '#shared/coach-drawings.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { boardMarkup, moveSquares } from '#shared/still-board.ts';

// What each kind of the coach's drawing looks like, for the settings' card to
// show over the kind's tile (drawings-card.ts): a position the coach would
// draw it on, and the drawing the review would put there, as its board does.

interface Scene {
  readonly fen: string;
  /** The move just played, as the board highlights it. */
  readonly move: string;
  readonly marks: readonly Mark[];
}

const SCENES: Readonly<Record<DrawingTopic, Scene>> = {
  // A back-rank mate: the rook's line, the squares it bars, the pawns that wall the king in.
  mates: {
    fen: '3R2k1/5ppp/8/8/8/8/5PPP/6K1',
    move: 'd1d8',
    marks: [
      { kind: 'link', from: 'd8', to: 'g8', tone: 'attack' },
      { kind: 'barred', square: 'f8', tone: 'attack' },
      { kind: 'barred', square: 'h8', tone: 'attack' },
      { kind: 'ring', square: 'f7', tone: 'plan' },
      { kind: 'ring', square: 'g7', tone: 'plan' },
      { kind: 'ring', square: 'h7', tone: 'plan' },
      { kind: 'ring', square: 'g8', tone: 'attack' },
    ],
  },
  forks: {
    fen: 'r3k3/2N5/8/8/8/8/8/4K3',
    move: 'd5c7',
    marks: [
      { kind: 'link', from: 'c7', to: 'e8', tone: 'attack' },
      { kind: 'link', from: 'c7', to: 'a8', tone: 'attack' },
      { kind: 'ring', square: 'e8', tone: 'attack' },
      { kind: 'ring', square: 'a8', tone: 'attack' },
    ],
  },
  pins: {
    fen: '4k3/8/2n5/1B6/8/8/8/4K3',
    move: 'f1b5',
    marks: [
      { kind: 'link', from: 'b5', to: 'e8', tone: 'attack' },
      { kind: 'ring', square: 'c6', tone: 'attack' },
      { kind: 'ring', square: 'e8', tone: 'plan' },
    ],
  },
  // An x-ray: the rook backs up the queen's capture through the rook in front of it.
  lines: {
    fen: '3r2k1/5ppp/8/3R4/8/8/5PPP/3q2K1',
    move: 'g4d1',
    marks: [
      { kind: 'link', from: 'd8', to: 'd1', tone: 'defense' },
      { kind: 'ring', square: 'd5', tone: 'attack' },
    ],
  },
  hanging: {
    fen: '6k1/5p1p/6p1/5N2/8/8/5PPP/6K1',
    move: 'e3f5',
    marks: [
      { kind: 'link', from: 'g6', to: 'f5', tone: 'attack' },
      { kind: 'ring', square: 'f5', tone: 'attack' },
    ],
  },
  checks: {
    fen: 'r3k3/8/8/8/8/8/4Q3/4K3',
    move: 'd2e2',
    marks: [
      { kind: 'link', from: 'e2', to: 'e8', tone: 'attack' },
      { kind: 'ring', square: 'e8', tone: 'attack' },
    ],
  },
  threats: {
    fen: '4k3/8/5n2/4P3/8/8/8/4K3',
    move: 'e4e5',
    marks: [
      { kind: 'link', from: 'e5', to: 'f6', tone: 'attack' },
      { kind: 'ring', square: 'f6', tone: 'attack' },
    ],
  },
  // A rook on the open file.
  plans: {
    fen: '6k1/ppp2ppp/8/8/8/8/PPP2PPP/3R2K1',
    move: 'a1d1',
    marks: [
      {
        kind: 'run',
        from: 'd1',
        squares: ['d2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'],
        tone: 'plan',
      },
    ],
  },
  // The rule of the square: the king inside the passed pawn's catches it.
  pawns: {
    fen: '8/6k1/8/3P4/8/8/8/6K1',
    move: 'd4d5',
    marks: [
      { kind: 'area', from: 'd5', to: 'g8' },
      { kind: 'run', from: 'd5', squares: ['d6', 'd7', 'd8'], tone: 'plan' },
    ],
  },
  // King and pawn against king: the key squares two ranks ahead of the pawn.
  endings: {
    fen: '8/8/8/8/4P3/4K3/8/k7',
    move: 'd2e3',
    marks: [{ kind: 'cells', squares: ['d6', 'e6', 'f6'], tone: 'plan' }],
  },
};

/** The board of `topic`'s example, its drawing under the pieces. */
export function previewMarkup(topic: DrawingTopic): SafeHtml {
  const { fen, move, marks } = SCENES[topic];
  const drawing = html`<svg class="ln-ext-drawings__marks" viewBox="0 0 8 8">${drawingMarkup(marks, true)}</svg>`;
  return boardMarkup({ fen, orientation: 'white', lastMove: moveSquares(move) }, drawing);
}
