// The fur's strand texture: Worley noise on a 64³ grid that wraps every 8
// cells, each texel holding the distance to its nearest feature point (a
// strand's root) and that point's random number, both as bytes.

export const STRAND_TEXELS = 64;
export const STRAND_CELLS = 8;
/** The distance a byte of 255 stands for, in cells. */
export const STRAND_RANGE = 1.25;

type Point = readonly [number, number, number, number];

const wrap = (cell: number): number => (cell + STRAND_CELLS) % STRAND_CELLS;

function nearest(points: readonly Point[], x: number, y: number, z: number): [number, number] {
  const [cellX, cellY, cellZ] = [Math.floor(x), Math.floor(y), Math.floor(z)];
  let best = Infinity;
  let seed = 0;
  for (let k = -1; k <= 1; k++)
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++) {
        const index =
          wrap(cellX + i) + STRAND_CELLS * (wrap(cellY + j) + STRAND_CELLS * wrap(cellZ + k));
        const [px, py, pz, value] = points[index] ?? [0, 0, 0, 0];
        const distance =
          (cellX + i + px - x) ** 2 + (cellY + j + py - y) ** 2 + (cellZ + k + pz - z) ** 2;
        if (distance < best) {
          best = distance;
          seed = value;
        }
      }
  return [Math.sqrt(best), seed];
}

/** Two bytes per texel, x fastest: the distance (scaled by STRAND_RANGE) and the seed. */
export function strandData(random: () => number = Math.random): Uint8Array {
  const points: Point[] = Array.from({ length: STRAND_CELLS ** 3 }, () => [
    random(),
    random(),
    random(),
    random(),
  ]);
  const data = new Uint8Array(STRAND_TEXELS ** 3 * 2);
  const scale = STRAND_CELLS / STRAND_TEXELS;
  let offset = 0;
  for (let z = 0; z < STRAND_TEXELS; z++)
    for (let y = 0; y < STRAND_TEXELS; y++)
      for (let x = 0; x < STRAND_TEXELS; x++) {
        const [distance, seed] = nearest(
          points,
          (x + 0.5) * scale,
          (y + 0.5) * scale,
          (z + 0.5) * scale,
        );
        data[offset++] = Math.min(255, Math.round((distance / STRAND_RANGE) * 255));
        data[offset++] = Math.round(seed * 255);
      }
  return data;
}
