import { isLightSquare } from '#shared/chess/squares.ts';
import { queryAll, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { oncePerFrame } from '#shared/frame.ts';
import { hasRings } from '#shared/piece-rings.ts';
import { cgKey } from '#page/lichess/chessground.ts';

// Each piece's square, light or dark, in `data-ln-ext-square`, for the rings a
// set of ours draws where a piece blends into its square
// (styles/board/piece-rings.css). CSS can't see the square under a piece: its
// transform makes it a stacking context, out of reach of a blend. Only while
// such a set is shown: the others cost the page nothing.

function markPieces(root: ParentNode): void {
  for (const piece of queryAll(root, 'piece', HTMLElement)) {
    const square = cgKey(piece);
    setData(piece, 'lnExtSquare', square && (isLightSquare(square) ? 'light' : 'dark'));
  }
}

function unmarkPieces(): void {
  for (const piece of queryAll(document, 'piece[data-ln-ext-square]', HTMLElement))
    setData(piece, 'lnExtSquare', null);
}

// What a change touches: a piece moved (its style) or added (its board), or a
// board drawn.
function touchedBoard(record: MutationRecord): ParentNode | null {
  const { target } = record;
  if (!(target instanceof Element)) return null;
  if (target.tagName === 'PIECE') return target.parentElement;
  if (target.tagName === 'CG-BOARD') return target;
  for (const node of record.addedNodes)
    if (node instanceof Element && node.querySelector('cg-board')) return node;
  return null;
}

function watchPieces(): MutationObserver {
  const touched = new Set<ParentNode>();
  const mark = oncePerFrame(() => {
    for (const root of touched) markPieces(root);
    touched.clear();
  });
  const observer = new MutationObserver(records => {
    for (const record of records) {
      const board = touchedBoard(record);
      if (board) touched.add(board);
    }
    if (touched.size > 0) mark();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style'],
  });
  markPieces(document);
  return observer;
}

function start(): void {
  const root = document.documentElement;
  let watching: MutationObserver | null = null;
  const follow = (): void => {
    const ringed = hasRings(root.dataset.lnExtPieces);
    if (ringed === (watching !== null)) return;
    watching?.disconnect();
    watching = ringed ? watchPieces() : null;
    if (!ringed) unmarkPieces();
  };
  new MutationObserver(follow).observe(root, {
    attributes: true,
    attributeFilter: ['data-ln-ext-pieces'],
  });
  follow();
}

export const pieceSquares: Feature = { name: 'piece squares', start };
