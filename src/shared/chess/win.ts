/** Lichess's win probability curve: White's chances, 0 to 100, from White's centipawns. */
export const winPercent = (cp: number): number =>
  50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
