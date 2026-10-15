import { describe, expect, it } from 'vitest';
import {
  backlitWords,
  DEFAULT_KEY_SHAPE,
  isBacklitBoard,
  keyBox,
  readBacklitWords,
} from './backlit.ts';

describe('the backlit boards', () => {
  it('reads back the settings it writes', () => {
    const settings = {
      light: 'sides',
      reach: 'wide',
      waves: 'always',
      shape: { gap: 0, radius: 12.4 },
    } as const;
    expect(backlitWords(settings)).toBe('sides wide always 0 12.4');
    expect(readBacklitWords(backlitWords(settings))).toEqual(settings);
  });

  it('reads nothing from a missing or a damaged attribute', () => {
    expect(readBacklitWords(undefined)).toBeNull();
    expect(readBacklitWords('')).toBeNull();
    expect(readBacklitWords('accent short')).toBeNull();
    expect(readBacklitWords('neon short captures 5.5 9.6')).toBeNull();
    expect(readBacklitWords('accent short captures')).toBeNull();
    expect(readBacklitWords('accent short captures 40 9.6')).toBeNull();
    expect(readBacklitWords('accent short captures 5.5 60')).toBeNull();
    expect(readBacklitWords('accent short captures -1 9.6')).toBeNull();
    expect(readBacklitWords('accent short captures 5.5 round')).toBeNull();
  });

  it('knows its boards from the others', () => {
    expect(isBacklitBoard('backlit')).toBe(true);
    expect(isBacklitBoard('backlit-panda')).toBe(true);
    expect(isBacklitBoard('backlit-neon')).toBe(false);
    expect(isBacklitBoard('blue')).toBe(false);
  });

  it('places a key in its square: half the gap on each side, its corners in hundredths', () => {
    const box = keyBox(DEFAULT_KEY_SHAPE);
    expect(box.inset).toBe(0.0275);
    expect(box.size).toBeCloseTo(0.945);
    expect(box.radius).toBe(0.096);
    expect(keyBox({ gap: 0, radius: 0 })).toEqual({ inset: 0, size: 1, radius: 0 });
  });

  it('rounds a key at most into a circle, however small the gap leaves it', () => {
    const round = keyBox({ gap: 16, radius: 50 });
    expect(round.size).toBeCloseTo(0.84);
    expect(round.radius).toBeCloseTo(0.42);
    expect(keyBox({ gap: 0, radius: 50 }).radius).toBe(0.5);
  });
});
