import {
  colorLetter,
  parseFen,
  ROLE_LETTERS,
  type Square,
  squareCoords,
} from '#shared/chess/index.ts';
import { html, setHtml, type SafeHtml } from '#shared/html.ts';
import { pieceUrl } from './pieces.ts';

// The demo's board, in the board and the piece set picked: a piece moves
// from square to square as chessground moves it, each position matched
// against the last by piece, so a step back or a jump slides the pieces too.

const FILES = 'abcdefgh';

/** Where a square sits, in squares from the top left, White at the bottom. */
function cell(square: Square): { x: number; y: number } {
  const [file, rank] = squareCoords(square);
  return { x: file, y: 7 - rank };
}

const distance = (from: Square, to: Square): number => {
  const [start, end] = [cell(from), cell(to)];
  return Math.hypot(start.x - end.x, start.y - end.y);
};

/** The pieces of a FEN, by square: `wN`, `bQ`… as our sets name their files. */
export function piecesOf(fen: string): Map<Square, string> {
  const pieces = new Map<Square, string>();
  for (const [square, piece] of parseFen(fen).board)
    pieces.set(square, colorLetter(piece.color) + ROLE_LETTERS[piece.role].toUpperCase());
  return pieces;
}

const coordinates = (): SafeHtml => {
  const files = FILES.split('').map(
    (file, i) => html`<span class="demo-coord demo-coord--file" style="--x:${i}">${file}</span>`,
  );
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1].map(
    (rank, i) => html`<span class="demo-coord demo-coord--rank" style="--y:${i}">${rank}</span>`,
  );
  return html`${files}${ranks}`;
};

interface Placed {
  readonly element: HTMLImageElement;
  readonly code: string;
}

export class DemoBoard {
  readonly #pieces: HTMLElement;
  readonly #under: HTMLElement;
  readonly #over: HTMLElement;
  #placed = new Map<Square, Placed>();
  #set: string;

  constructor(host: HTMLElement, pieceSet: string) {
    this.#set = pieceSet;
    setHtml(
      host,
      html`<div class="demo-under"></div>${coordinates()}<div class="demo-pieces"></div><div class="demo-over"></div>`,
    );
    const [under, pieces, over] = [...host.querySelectorAll(':scope > div')];
    if (
      !(under instanceof HTMLElement) ||
      !(pieces instanceof HTMLElement) ||
      !(over instanceof HTMLElement)
    )
      throw new Error('the demo board has no layers');
    this.#under = under;
    this.#pieces = pieces;
    this.#over = over;
  }

  #src(code: string): string {
    return pieceUrl(this.#set, code);
  }

  setPieceSet(pieceSet: string): void {
    this.#set = pieceSet;
    for (const { element, code } of this.#placed.values()) element.src = this.#src(code);
  }

  #place(element: HTMLElement, square: Square): void {
    const { x, y } = cell(square);
    element.style.setProperty('--x', String(x));
    element.style.setProperty('--y', String(y));
  }

  #add(square: Square, code: string): void {
    const element = document.createElement('img');
    element.className = 'demo-piece demo-piece--in';
    element.alt = '';
    element.src = this.#src(code);
    this.#place(element, square);
    this.#pieces.append(element);
    this.#placed.set(square, { element, code });
  }

  /** Shows `fen`, sliding each piece that moved from where it was. */
  show(fen: string): void {
    const target = piecesOf(fen);
    const kept = new Map<Square, Placed>();
    const left: [Square, Placed][] = [];
    for (const [square, placed] of this.#placed)
      if (target.get(square) === placed.code) kept.set(square, placed);
      else left.push([square, placed]);
    const arriving = [...target].filter(([square]) => !kept.has(square));
    this.#placed = kept;
    for (const [square, code] of arriving) {
      const candidates = left.filter(([, placed]) => placed.code === code);
      const nearest = candidates.toSorted(
        (left, right) => distance(left[0], square) - distance(right[0], square),
      )[0];
      if (!nearest) {
        this.#add(square, code);
        continue;
      }
      left.splice(left.indexOf(nearest), 1);
      nearest[1].element.classList.toggle('demo-piece--in', false);
      this.#place(nearest[1].element, square);
      this.#placed.set(square, nearest[1]);
    }
    // The pieces taken fade where they stood.
    for (const [, { element }] of left) {
      element.classList.toggle('demo-piece--out', true);
      element.addEventListener('transitionend', () => element.remove(), { once: true });
      setTimeout(() => element.remove(), 400);
    }
  }

  /** What lies under the pieces: the last move's squares. */
  setUnder(markup: SafeHtml): void {
    setHtml(this.#under, markup);
  }

  /** What lies over them: the class's badge, the arrows and the coach's drawing. */
  setOver(markup: SafeHtml): void {
    setHtml(this.#over, markup);
  }
}

/** A square's box, as a style the layers' children take. */
export function squareStyle(square: Square): string {
  const { x, y } = cell(square);
  return `--x:${x};--y:${y}`;
}

/** A square's center in the 8 × 8 viewBox of the layers' SVG. */
export function squareCenter(square: Square): { x: number; y: number } {
  const { x, y } = cell(square);
  return { x: x + 0.5, y: y + 0.5 };
}
