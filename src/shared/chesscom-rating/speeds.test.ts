import { describe, expect, it } from 'vitest';
import { speedOfGlyph, speedOfPath, speedOfTimeControl } from './speeds.ts';

describe('the speed of a rating', () => {
  it('is its perf glyph’s, none for a variant’s', () => {
    expect(speedOfGlyph('\ue032')).toBe('bullet');
    expect(speedOfGlyph('\ue008')).toBe('blitz');
    expect(speedOfGlyph('\ue002')).toBe('rapid');
    expect(speedOfGlyph('\ue00a')).toBe('classical');
    // Crazyhouse's, correspondence's.
    expect(speedOfGlyph('\ue00b')).toBeNull();
    expect(speedOfGlyph('\ue019')).toBeNull();
    expect(speedOfGlyph(undefined)).toBeNull();
  });

  it('is its clock’s, counted as Lichess does', () => {
    expect(speedOfTimeControl('60+0')).toBe('bullet');
    expect(speedOfTimeControl('120+1')).toBe('bullet');
    expect(speedOfTimeControl('180+0')).toBe('blitz');
    expect(speedOfTimeControl('600+5')).toBe('rapid');
    expect(speedOfTimeControl('1800+20')).toBe('classical');
    expect(speedOfTimeControl('15+0')).toBe('ultraBullet');
    expect(speedOfTimeControl('-')).toBeNull();
    expect(speedOfTimeControl(undefined)).toBeNull();
  });

  it('is its stats page’s or its leaderboard’s', () => {
    expect(speedOfPath('/@/eresy/perf/blitz')).toBe('blitz');
    expect(speedOfPath('/player/top/rapid')).toBe('rapid');
    expect(speedOfPath('/player/top/200/bullet')).toBe('bullet');
    expect(speedOfPath('/@/eresy')).toBeNull();
  });
});
