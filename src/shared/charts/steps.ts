/**
 * The values from `from` up to `to`, `step` (> 0) apart. They're summed one
 * step at a time, so fractional steps drift exactly as a plain loop's would.
 */
export function steps(from: number, to: number, step: number): number[] {
  const values: number[] = [];
  for (let value = from; value <= to; value += step) values.push(value);
  return values;
}

export interface NiceScale {
  readonly step: number;
  readonly max: number;
}

/** A round top for `most`, in about four steps of 1, 2, 2.5 or 5 × 10ⁿ. */
export function niceScale(most: number): NiceScale {
  const rough = most / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough === 0 ? 1 : rough));
  const step =
    [1, 2, 2.5, 5, 10].map(k => k * magnitude).find(candidate => candidate >= rough) ??
    10 * magnitude;
  return { step, max: Math.ceil(most / step) * step };
}
