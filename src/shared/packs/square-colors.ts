// The two colors of a board's squares, from its pixels, for the coordinates
// drawn on them when the board doesn't name them (a board from the user's
// files): the middle of each square, averaged over the light ones and the dark.

export interface SquareColors {
  readonly light: string;
  readonly dark: string;
}

const hex = (sum: readonly number[], count: number): string =>
  `#${sum
    .map(channel =>
      Math.round(channel / count)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

/** The colors of an RGBA image of the board, `size` pixels a side, a8 (a light square) top left. */
export function squareColors(pixels: ArrayLike<number>, size: number): SquareColors {
  const square = size / 8;
  const sums = { light: [0, 0, 0], dark: [0, 0, 0] };
  const counts = { light: 0, dark: 0 };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      // Its middle half only: coordinates, borders and antialiasing sit at the edges.
      const inX = (x % square) / square;
      const inY = (y % square) / square;
      if (inX < 0.25 || inX >= 0.75 || inY < 0.25 || inY >= 0.75) continue;
      const shade = (Math.floor(x / square) + Math.floor(y / square)) % 2 === 0 ? 'light' : 'dark';
      const offset = (y * size + x) * 4;
      for (let channel = 0; channel < 3; channel++)
        sums[shade][channel] = (sums[shade][channel] ?? 0) + (pixels[offset + channel] ?? 0);
      counts[shade] += 1;
    }
  return { light: hex(sums.light, counts.light), dark: hex(sums.dark, counts.dark) };
}
