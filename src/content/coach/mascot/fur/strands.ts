// The fur's strand texture: Worley noise on a 64³ grid that wraps every 8
// cells, each texel holding the distance to its nearest feature point (a
// strand's root) and that point's random number, both as bytes.

export const STRAND_TEXELS = 64;
export const STRAND_CELLS = 8;
/** The distance a byte of 255 stands for, in cells. */
export const STRAND_RANGE = 1.25;

const POINT_COUNT = STRAND_CELLS ** 3;

const wrap = (cell: number): number => (cell + STRAND_CELLS) % STRAND_CELLS;

// The nearest feature point's distance and seed, written over for each texel: this runs for
// each of the 262,144 as a coach appears, so it allocates nothing.
const found = { distance: 0, seed: 0 };

function nearest(points: Float64Array, x: number, y: number, z: number): void {
  const cellX = Math.floor(x);
  const cellY = Math.floor(y);
  const cellZ = Math.floor(z);
  let best = Infinity;
  let seed = 0;
  for (let k = -1; k <= 1; k++) {
    const layer = STRAND_CELLS * wrap(cellZ + k);
    for (let j = -1; j <= 1; j++) {
      const row = STRAND_CELLS * (wrap(cellY + j) + layer);
      for (let i = -1; i <= 1; i++) {
        const index = 4 * (wrap(cellX + i) + row);
        const distanceX = cellX + i + (points[index] ?? 0) - x;
        const distanceY = cellY + j + (points[index + 1] ?? 0) - y;
        const distanceZ = cellZ + k + (points[index + 2] ?? 0) - z;
        const distance = distanceX * distanceX + distanceY * distanceY + distanceZ * distanceZ;
        if (distance < best) {
          best = distance;
          seed = points[index + 3] ?? 0;
        }
      }
    }
  }
  found.distance = Math.sqrt(best);
  found.seed = seed;
}

/** Two bytes per texel, x fastest: the distance (scaled by STRAND_RANGE) and the seed. */
export function strandData(random: () => number = Math.random): Uint8Array {
  // Each cell's feature point (x, y, z in the cell) and its random number.
  const points = new Float64Array(POINT_COUNT * 4);
  for (let index = 0; index < points.length; index++) points[index] = random();
  const data = new Uint8Array(STRAND_TEXELS ** 3 * 2);
  const scale = STRAND_CELLS / STRAND_TEXELS;
  let offset = 0;
  for (let z = 0; z < STRAND_TEXELS; z++)
    for (let y = 0; y < STRAND_TEXELS; y++)
      for (let x = 0; x < STRAND_TEXELS; x++) {
        nearest(points, (x + 0.5) * scale, (y + 0.5) * scale, (z + 0.5) * scale);
        data[offset++] = Math.min(255, Math.round((found.distance / STRAND_RANGE) * 255));
        data[offset++] = Math.round(found.seed * 255);
      }
  return data;
}
