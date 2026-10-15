import { parsePlacement } from '#shared/chess/fen.ts';
import { squareCoords } from '#shared/chess/squares.ts';
import type { Square } from '#shared/chess/types.ts';
import {
  createCustomElement,
  createElement,
  queryAll,
  queryOne,
  setStyleProperty,
} from '#shared/dom.ts';
import type { PreviewAction } from '#shared/protocol.ts';
import { soundPlayer } from '#page/lichess/sound.ts';
import { LINE, type PreviewMove, slidesOf, START } from './line.ts';

// The settings' preview board (content/settings/looks-preview.ts), drawn here
// as chessground draws its own, squares in `cgKey` and all, so that the sounds
// and the backlit light (#page/backlit) follow its moves as they follow a game's.

const PREVIEW_HOST = '.lr-ext-looks-preview__board';
const STEP_MS = 1000;
// Before the first move of a game started again: long enough to see it start.
const PAUSE_MS = 450;
// The stylesheet's slide (styles/pages/settings-looks.css), chessground's `anim` meanwhile.
const SLIDE_MS = 260;

interface Preview {
  readonly host: HTMLElement;
  readonly board: HTMLElement;
  readonly pieces: Map<Square, HTMLElement>;
  ply: number;
}

function place(element: HTMLElement, square: Square): void {
  const [file, rank] = squareCoords(square);
  Object.assign(element, { cgKey: square });
  setStyleProperty(element, 'transform', `translate(${file * 100}%, ${(7 - rank) * 100}%)`);
}

function draw(host: HTMLElement): Preview {
  const wrap = createElement('div', { className: 'cg-wrap orientation-white' });
  const container = createCustomElement('cg-container');
  const board = createCustomElement('cg-board');
  const pieces = new Map<Square, HTMLElement>();
  for (const [square, { color, role }] of parsePlacement(START)) {
    const piece = createCustomElement('piece', { className: `${color} ${role}` });
    place(piece, square);
    pieces.set(square, piece);
    board.append(piece);
  }
  container.append(board);
  wrap.append(container);
  host.replaceChildren(wrap);
  return { host, board, pieces, ply: 0 };
}

function markLastMove(board: HTMLElement, { from, to }: PreviewMove): void {
  for (const square of queryAll(board, 'square.last-move', HTMLElement)) square.remove();
  // Squares come before the pieces, as chessground puts them.
  board.prepend(
    ...[from, to].map(key => {
      const square = createCustomElement('square', { className: 'last-move' });
      place(square, key);
      return square;
    }),
  );
}

function slide({ pieces }: Preview, from: Square, to: Square): void {
  const piece = pieces.get(from);
  if (!piece) return;
  pieces.get(to)?.remove();
  pieces.delete(from);
  pieces.set(to, piece);
  piece.classList.toggle('anim', true);
  place(piece, to);
  window.setTimeout(() => piece.classList.toggle('anim', false), SLIDE_MS);
}

function playMove(preview: Preview, move: PreviewMove): void {
  markLastMove(preview.board, move);
  for (const [from, to] of slidesOf(move)) slide(preview, from, to);
  preview.ply++;
  // Through Lichess's player, which plays a pack's sounds or ours in its place.
  soundPlayer()?.move({ san: move.san, uci: `${move.from}${move.to}` });
}

const isShown = (host: HTMLElement): boolean =>
  host.isConnected && host.getClientRects().length > 0;

/** Draws the board in the settings and plays its game, as the content script asks. */
export function createPreview(): (action: PreviewAction) => void {
  let preview: Preview | null = null;
  let timer: number | undefined;
  let playing = false;

  const playOn = (shown: Preview): void => {
    const move = LINE[shown.ply];
    timer = undefined;
    if (!move || !isShown(shown.host)) {
      playing = false;
      return;
    }
    playMove(shown, move);
    if (playing) timer = window.setTimeout(() => playOn(shown), STEP_MS);
  };

  return action => {
    const host = queryOne(document, PREVIEW_HOST, HTMLElement);
    if (!host) return;
    if (preview?.host !== host || !host.contains(preview.board)) preview = draw(host);
    // A sound picked while the game plays is heard on its next move.
    if (action === 'draw' || (action === 'step' && playing)) return;
    window.clearTimeout(timer);
    playing = action === 'play';
    const shown = preview;
    if (!playing && shown.ply < LINE.length) {
      playOn(shown);
      return;
    }
    // The game from the start again, its first move once it's seen.
    preview = draw(host);
    const fresh = preview;
    timer = window.setTimeout(() => playOn(fresh), PAUSE_MS);
  };
}
