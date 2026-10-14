import { describe, expect, it } from 'vitest';
import { advanced, pitchFor, placementFor, rankFrom } from './place.ts';

describe('where a move sounds', () => {
  it('counts ranks from the mover’s side', () => {
    expect(rankFrom('e2', 'white')).toBe(1);
    expect(rankFrom('e2', 'black')).toBe(6);
  });

  it('climbs a pentatonic scale toward the other side, the same for both', () => {
    const white = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'] as const;
    expect(white.map(square => pitchFor(square, 'white'))).toEqual([-7, -5, -3, 0, 2, 5, 7, 9]);
    expect(pitchFor('h8', 'black')).toBe(pitchFor('a1', 'white'));
  });

  it('knows a move toward the other side, or across, from one back', () => {
    expect(advanced('c1', 'g5', 'white')).toBe(true);
    expect(advanced('c1', 'h1', 'white')).toBe(true);
    expect(advanced('g5', 'c1', 'white')).toBe(false);
    expect(advanced('g5', 'c1', 'black')).toBe(true);
  });

  it('pans by the file, as the listener sees the board', () => {
    expect(placementFor('a4', 'white', 'stereo')).toEqual({ pan: -0.4, gain: 1 });
    expect(placementFor('a4', 'black', 'stereo')).toEqual({ pan: 0.4, gain: 1 });
    expect(placementFor('h8', 'white', 'none')).toEqual({ gain: 1 });
  });

  it('lays the board out before the listener, the far squares lifted back up', () => {
    const near = placementFor('a1', 'white', 'space');
    const far = placementFor('h8', 'white', 'space');
    expect(near.pos?.[0]).toBeLessThan(0);
    expect(far.pos?.[0]).toBeGreaterThan(0);
    expect(far.pos?.[2]).toBeLessThan(near.pos?.[2] ?? 0);
    expect(far.gain).toBeCloseTo(1);
    expect(near.gain).toBeLessThan(far.gain);
    expect(placementFor('h8', 'black', 'space')).toEqual(near);
  });
});
