// The lumps that make the edges' colour uneven (after distortion-waves, MIT):
// each a bump along the area's perimeter that drifts and breathes over time.

export const LUMPS = 7;

const hash = (index: number, scale: number, offset: number): number => {
  const value = Math.sin(index * scale + offset) * 43_758.5453;
  return value - Math.floor(value);
};

export interface RimShape {
  readonly width: number;
  readonly height: number;
  readonly cornerRadius: number;
  /** How much the lumps drift and breathe, 0 to 1. */
  readonly pulse: number;
}

/** Each lump's centre along the perimeter, its length and its depth, at `time`, flattened. */
export function rimLumps(
  time: number,
  { width, height, cornerRadius, pulse }: RimShape,
): Float32Array {
  const straightX = Math.max(width / 2 - cornerRadius, 0);
  const straightY = Math.max(height / 2 - cornerRadius, 0);
  const perimeter = 4 * (straightX + straightY + 0.5 * Math.PI * cornerRadius);
  const lumps = new Float32Array(LUMPS * 3);
  for (let i = 0; i < LUMPS; i++) {
    const place = hash(i, 12.9898, 1.3);
    const drift = hash(i, 78.233, 4.1);
    const size = hash(i, 39.425, 2.7);
    const breath =
      (0.25 + 0.3 * pulse) * Math.sin(time * (1.1 + 1.2 * place) * (1 + pulse) + i * 2.4);
    lumps[i * 3] =
      (perimeter * (i + 0.35 * place)) / LUMPS + time * (-22 + 44 * drift) * (1 + 2 * pulse);
    lumps[i * 3 + 1] = (perimeter / LUMPS) * (0.2 + 0.25 * size);
    lumps[i * 3 + 2] = (0.2 + 2.6 * drift) * (1 + breath);
  }
  return lumps;
}
