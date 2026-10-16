import { describe, expect, it } from 'vitest';
import type { CoachMood } from '#shared/coach.ts';
import { wingBeat, type WingBeat } from './wing-beat.ts';

const BURST = { seconds: 1.2, beats: 6, lift: 0.4 } as const;
const FLUTTER = { seconds: 0.5, beats: 3, lift: 0.25 } as const;
const FRAME = 1 / 60;

/** How far the wings beat at most from `from` to `to` seconds, in `mood`. */
function widest(beat: WingBeat, from: number, to: number, mood: CoachMood): number {
  let most = 0;
  for (let time = from; time < to; time += FRAME) {
    beat.update(time, mood);
    most = Math.max(most, beat.lift());
  }
  return most;
}

describe('wingBeat', () => {
  it('keeps the wings at rest while nothing happens', () => {
    expect(widest(wingBeat(BURST, FLUTTER), 0, 4.5, 'neutral')).toBeLessThan(0.05);
  });

  it('beats a burst as the mood turns lively, then rests again', () => {
    const beat = wingBeat(BURST, FLUTTER);
    widest(beat, 0, 1, 'neutral');
    expect(widest(beat, 1, 1 + BURST.seconds, 'happy')).toBeGreaterThan(BURST.lift * 0.6);
    expect(widest(beat, 1 + BURST.seconds, 4.5, 'happy')).toBeLessThan(0.05);
  });

  it('beats no burst for a mood that isn’t lively', () => {
    const beat = wingBeat(BURST, FLUTTER);
    widest(beat, 0, 1, 'neutral');
    expect(widest(beat, 1, 4.5, 'sad')).toBeLessThan(0.05);
  });

  it('flutters now and then, a smaller beat', () => {
    const most = widest(wingBeat(BURST, FLUTTER), 0, 10, 'neutral');
    expect(most).toBeGreaterThan(FLUTTER.lift * 0.6);
    expect(most).toBeLessThan(BURST.lift * 0.75);
  });
});
