// The piece sets of ours that draw a ring around a piece where it blends into
// its square (styles/board/piece-rings.css, from tools/piece-sets/rings.py).

export const RINGED_SETS: readonly string[] = ['pebble', 'loop', 'fold'];

/** Whether the set named in `data-ln-ext-pieces` draws rings. */
export const hasRings = (set: string | undefined): boolean =>
  set !== undefined && RINGED_SETS.includes(set);
