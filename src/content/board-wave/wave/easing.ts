// The curves the wave moves on.

/** 0 below `low`, 1 above `high`, and a smooth step between, as GLSL's smoothstep. */
export function smoothStep(low: number, high: number, value: number): number {
  const share = Math.min(Math.max((value - low) / (high - low), 0), 1);
  return share * share * (3 - 2 * share);
}

const bezier = (along: number, first: number, second: number): number => {
  const rest = 1 - along;
  return 3 * rest * rest * along * first + 3 * rest * along * along * second + along ** 3;
};

/** CSS's `cubic-bezier(x1, y1, x2, y2)`, solved by halving. */
export function cubicBezier([x1, y1, x2, y2]: readonly [number, number, number, number]): (
  x: number,
) => number {
  return x => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let low = 0;
    let high = 1;
    for (let i = 0; i < 24; i++) {
      const middle = (low + high) / 2;
      if (bezier(middle, x1, x2) < x) low = middle;
      else high = middle;
    }
    return bezier((low + high) / 2, y1, y2);
  };
}
