// The bell curve the converter draws over Chess.com's ruler (chesscom.ts): how
// the players at a Lichess Elo spread on Chess.com, taken as a normal law whose
// middle half is the converter's `spread` either side of its rating.

// For a normal law, the middle half lies within 0.6745 standard deviations of its mean.
const QUARTILE = 0.6745;
// How far out the curve is drawn, in standard deviations: past it, it's flat.
const REACH = 3;
const SAMPLES = 48;

export interface Bell {
  rating: number;
  spread: number;
  /** The Elo at the scale's end. */
  scale: number;
  /** The box's height: the curve peaks at its top and rests on its bottom. */
  height: number;
}

/** The area under the curve between two Elos, as an SVG path in a box 100 wide. */
export function bellArea(bell: Bell, from: number, to: number): string {
  const sigma = Math.max(bell.spread, 1) / QUARTILE;
  const point = (elo: number): string => {
    const z = (elo - bell.rating) / sigma;
    const y = bell.height * (1 - Math.exp((-z * z) / 2));
    return `${((elo / bell.scale) * 100).toFixed(3)} ${y.toFixed(3)}`;
  };
  const points = Array.from({ length: SAMPLES + 1 }, (_, i) =>
    point(from + ((to - from) * i) / SAMPLES),
  );
  const start = ((from / bell.scale) * 100).toFixed(3);
  const end = ((to / bell.scale) * 100).toFixed(3);
  return `M${start} ${bell.height} L${points.join(' L')} L${end} ${bell.height} Z`;
}

/** The whole curve, and the middle half of the players under it, cut at the scale's ends. */
export function bellPaths(bell: Bell): { whole: string; middle: string } {
  const reach = (REACH * Math.max(bell.spread, 1)) / QUARTILE;
  const within = (from: number, to: number): string =>
    bellArea(bell, Math.max(0, from), Math.min(bell.scale, to));
  return {
    whole: within(bell.rating - reach, bell.rating + reach),
    middle: within(bell.rating - bell.spread, bell.rating + bell.spread),
  };
}
