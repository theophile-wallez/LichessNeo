// The extension's own piece sets, drawn for it (tools/piece-sets, into
// public/img/pieces). While one is picked, `data-ln-ext-pieces` on <html> names
// it and styles/board/piece-sets.css puts its images in the variables Lichess
// draws its pieces from.

export const PIECE_SETS = [
  { id: 'mochi', name: 'Mochi' },
  { id: 'mellow', name: 'Mellow' },
  { id: 'poppy', name: 'Poppy' },
  { id: 'bop', name: 'Bop' },
  { id: 'pebble', name: 'Pebble' },
  { id: 'loop', name: 'Loop' },
  { id: 'fold', name: 'Fold' },
  { id: 'bitty', name: 'Bitty' },
] as const;

const PIECE_SET_IDS: ReadonlySet<string> = new Set(PIECE_SETS.map(set => set.id));

export const isPieceSet = (id: string): boolean => PIECE_SET_IDS.has(id);
