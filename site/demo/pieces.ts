import { RING_EDGES } from '#shared/piece-rings.ts';

// Where a piece set's files are: Lichess's own (cburnett, kept with the site)
// or one of the extension's (public/img/pieces). And the rings a set of ours
// draws where a piece blends into its square, as the extension draws them
// (rings.css).

export const LICHESS_SET = 'cburnett';

export const PIECE_CODES = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];

export const pieceUrl = (pieceSet: string, code: string): string =>
  pieceSet === LICHESS_SET
    ? `pieces/${LICHESS_SET}/${code}.svg`
    : `img/pieces/${pieceSet}/${code}.webp`;

export const pieceSide = (code: string): 'white' | 'black' =>
  code.startsWith('w') ? 'white' : 'black';

/** A board's piece, in the set on <html>: its picture and its ring's mask. */
export const pieceStyle = (code: string): string =>
  `background-image:var(--pc-${code});--ring-mask:var(--ring-${code})`;

/** The rings of `pieceSet` on <html>, each piece's mask and each side's edges; none for a set without. */
export function setPieceRings(root: HTMLElement, pieceSet: string): void {
  const edges = RING_EDGES[pieceSet];
  for (const code of PIECE_CODES) {
    const mask = new URL(`img/pieces/${pieceSet}/rings/${code}.webp`, document.baseURI).href;
    if (edges) root.style.setProperty(`--ring-${code}`, `url("${mask}")`);
    else root.style.removeProperty(`--ring-${code}`);
  }
  for (const side of ['white', 'black'] as const)
    if (edges) root.style.setProperty(`--ring-edge-${side}`, String(edges[side]));
    else root.style.removeProperty(`--ring-edge-${side}`);
}
