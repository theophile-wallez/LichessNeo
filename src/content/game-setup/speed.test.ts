import { describe, expect, it } from 'vitest';
import { parseMinutes, presetSpeed, speedOf } from './speed.ts';

describe('a clock’s speed', () => {
  it.each([
    [0.25, 0, 'ultrabullet'],
    [0.5, 0, 'bullet'],
    [1, 0, 'bullet'],
    [2, 1, 'bullet'],
    [3, 0, 'blitz'],
    [3, 2, 'blitz'],
    [5, 3, 'blitz'],
    [8, 0, 'rapid'],
    [10, 5, 'rapid'],
    [15, 10, 'rapid'],
    [25, 0, 'classical'],
    [30, 20, 'classical'],
  ] as const)('files %s+%s as %s, as Lichess does', (minutes, increment, speed) => {
    expect(speedOf(minutes, increment)).toBe(speed);
  });

  it('counts forty moves’ increments', () => {
    // 2 minutes and 2 seconds a move: 120 + 80 seconds, over a bullet's 179.
    expect(speedOf(2, 2)).toBe('blitz');
  });
});

describe('minutes as the setup writes them', () => {
  it.each([
    ['¼', 0.25],
    ['½', 0.5],
    ['¾', 0.75],
    ['1.5', 1.5],
    [' 5 ', 5],
    ['0', 0],
  ])('reads %s', (text, minutes) => {
    expect(parseMinutes(text)).toBe(minutes);
  });

  it.each(['', '∞', '-1', 'five'])('reads nothing from %j', text => {
    expect(parseMinutes(text)).toBeNull();
  });
});

describe('a preset’s speed', () => {
  it.each([
    ['1+0', 'bullet'],
    ['3+2', 'blitz'],
    ['10+5', 'rapid'],
    ['30+20', 'classical'],
    ['½ + 0', 'bullet'],
  ])('reads %s as %s', (text, speed) => {
    expect(presetSpeed(text)).toBe(speed);
  });

  it.each(['Custom', '3', '3+', '+2'])('reads nothing from %j', text => {
    expect(presetSpeed(text)).toBeNull();
  });
});
