// The piece sets of ours that draw a ring around a piece where it blends into
// its square (styles/board/piece-rings.css, from tools/piece-sets/rings.py).

/**
 * Each ringed set's edges, as rings.py prints them: the mean OKLab lightness of
 * each side's pieces where they meet the square. piece-ring-sets.css holds the
 * same for the extension, and the site's rings read them here.
 */
export const RING_EDGES: Readonly<Record<string, { white: number; black: number }>> = {
  pebble: { white: 0.853, black: 0.43 },
  loop: { white: 0.819, black: 0.441 },
  fold: { white: 0.87, black: 0.412 },
};

export const RINGED_SETS: readonly string[] = Object.keys(RING_EDGES);

/** Whether the set named in `data-ln-ext-pieces` draws rings. */
export const hasRings = (set: string | undefined): boolean =>
  set !== undefined && RINGED_SETS.includes(set);
