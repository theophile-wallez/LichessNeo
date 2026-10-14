import { describe, expect, it } from 'vitest';
import { backlitWords, isBacklitBoard, readBacklitWords } from './backlit.ts';

describe('the backlit boards', () => {
  it('reads back the settings it writes', () => {
    const settings = { light: 'sides', reach: 'wide', waves: 'always' } as const;
    expect(backlitWords(settings)).toBe('sides wide always');
    expect(readBacklitWords(backlitWords(settings))).toEqual(settings);
  });

  it('reads nothing from a missing or a damaged attribute', () => {
    expect(readBacklitWords(undefined)).toBeNull();
    expect(readBacklitWords('')).toBeNull();
    expect(readBacklitWords('accent short')).toBeNull();
    expect(readBacklitWords('neon short captures')).toBeNull();
  });

  it('knows its boards from the others', () => {
    expect(isBacklitBoard('backlit')).toBe(true);
    expect(isBacklitBoard('backlit-panda')).toBe(true);
    expect(isBacklitBoard('backlit-neon')).toBe(false);
    expect(isBacklitBoard('blue')).toBe(false);
  });
});
