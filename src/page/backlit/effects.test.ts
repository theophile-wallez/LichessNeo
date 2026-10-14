import { describe, expect, it } from 'vitest';
import {
  distance,
  PULSE_END_MS,
  pulseLevel,
  type Wave,
  waveLevel,
  waveMs,
  waveReach,
} from './effects.ts';

const wave = (spread: Wave['spread']): Wave => ({
  square: 'e4',
  start: 0,
  spread,
  reach: waveReach(spread, 'short'),
});

/** A key's brightest, and when it first lights, sampled every millisecond of the wave. */
const peakOf = (lit: Wave, keyDistance: number): { level: number; from: number } => {
  let peak = 0;
  let from = -1;
  for (let at = 0; at <= waveMs(lit); at += 1) {
    const level = waveLevel(lit, keyDistance, at);
    if (level > 0 && from < 0) from = at;
    peak = Math.max(peak, level);
  }
  return { level: peak, from };
};

describe('the backlit effects', () => {
  it('reaches further for a capture than for a move, and a quiet move its own key only', () => {
    expect(waveReach('strong', 'short')).toBeGreaterThan(waveReach('wave', 'short'));
    expect(waveReach('wave', 'wide')).toBeGreaterThan(waveReach('wave', 'short'));
    expect(waveReach('key', 'wide')).toBeLessThan(distance('e4', 'e5'));
  });

  it('lights the far keys later and dimmer, and none past the reach', () => {
    const lit = wave('wave');
    const near = peakOf(lit, 0);
    const far = peakOf(lit, 2);
    expect(near.level).toBe(1);
    expect(far.level).toBeGreaterThan(0);
    expect(far.level).toBeLessThan(near.level);
    expect(far.from).toBeGreaterThan(near.from + 100);
    expect(peakOf(lit, lit.reach + 0.1).level).toBe(0);
  });

  it('is dark before it starts and once it’s over', () => {
    const lit = wave('strong');
    expect(waveLevel(lit, 0, 0)).toBe(0);
    expect(waveLevel(lit, 0, waveMs(lit))).toBe(0);
    expect(waveLevel(lit, lit.reach - 0.01, waveMs(lit))).toBe(0);
  });

  it('pulses twice after a short wait, then goes dark', () => {
    const levels = Array.from({ length: PULSE_END_MS + 50 }, (_, at) => pulseLevel(at));
    expect(levels[0]).toBe(0);
    expect(levels[PULSE_END_MS]).toBe(0);
    const peaks = levels.filter(
      (level, at) => level > (levels[at - 1] ?? 0) && level >= (levels[at + 1] ?? 0),
    );
    expect(peaks).toHaveLength(2);
    expect(Math.min(...peaks)).toBeGreaterThan(0.8);
  });
});
