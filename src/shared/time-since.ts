// How long ago something happened (a player last seen, a game played), for
// `Intl.RelativeTimeFormat`.

interface SinceUnit {
  readonly ms: number;
  readonly unit: Intl.RelativeTimeFormatUnit;
}

const MINUTE: SinceUnit = { ms: 60_000, unit: 'minute' };

const SINCE_UNITS: readonly SinceUnit[] = [
  MINUTE,
  { ms: 3_600_000, unit: 'hour' },
  { ms: 86_400_000, unit: 'day' },
  { ms: 2_592_000_000, unit: 'month' },
  { ms: 31_536_000_000, unit: 'year' },
];

export interface Since {
  /** Negative, as a relative time in the past. */
  readonly value: number;
  readonly unit: Intl.RelativeTimeFormatUnit;
}

/** How long ago `at` was, in the largest unit that counts at least one. */
export function timeSince(at: number, now: number): Since {
  const elapsed = Math.max(now - at, 0);
  let chosen = MINUTE;
  for (const candidate of SINCE_UNITS) if (elapsed >= candidate.ms) chosen = candidate;
  return { value: -Math.max(1, Math.floor(elapsed / chosen.ms)), unit: chosen.unit };
}
