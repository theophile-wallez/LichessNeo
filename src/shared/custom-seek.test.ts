import { describe, expect, it } from 'vitest';
import {
  clockLabel,
  ClockSchema,
  CustomSeekSchema,
  minutesLabel,
  perfOfSeek,
  speedOfClock,
} from './custom-seek.ts';

const valid = (minutes: number, increment: number): boolean =>
  ClockSchema.safeParse({ minutes, increment }).success;

describe('a custom seek', () => {
  it("takes only the clocks Lichess's setup offers, and never one with no time", () => {
    expect([valid(3, 2), valid(0.5, 0), valid(0, 1), valid(180, 180)]).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect([valid(0, 0), valid(4.5, 0), valid(3, 100), valid(200, 0)]).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  it('is a clock, a variant Lichess plays and a mode', () => {
    const seek = { variant: 'atomic', minutes: 3, increment: 2, rated: false };
    expect(CustomSeekSchema.safeParse(seek).data).toEqual(seek);
    expect(CustomSeekSchema.safeParse({ ...seek, variant: 'fromPosition' }).success).toBe(false);
    expect(CustomSeekSchema.safeParse({ ...seek, minutes: 0, increment: 0 }).success).toBe(false);
  });

  it('counts its clock in the speed Lichess gives it: the time for 40 moves', () => {
    expect(
      [
        [0.25, 0],
        [0.5, 0],
        [2, 1],
        [3, 0],
        [7, 0],
        [8, 0],
        [15, 10],
        [25, 0],
      ].map(([minutes = 0, increment = 0]) => speedOfClock(minutes, increment)),
    ).toEqual(['ultraBullet', 'bullet', 'bullet', 'blitz', 'blitz', 'rapid', 'rapid', 'classical']);
  });

  it("counts in its variant's rating, or in Standard its clock's speed", () => {
    expect(perfOfSeek({ variant: 'standard', minutes: 1, increment: 0, rated: true })).toBe(
      'bullet',
    );
    expect(perfOfSeek({ variant: 'horde', minutes: 1, increment: 0, rated: true })).toBe('horde');
  });

  it('labels a clock with fractions of a minute, minutes alone without an increment', () => {
    expect([minutesLabel(0.25), minutesLabel(1.5), minutesLabel(10)]).toEqual(['¼', '1½', '10']);
    expect([clockLabel(0.5, 0), clockLabel(3, 2), clockLabel(10, 0), clockLabel(0, 1)]).toEqual([
      '½ min',
      '3 + 2',
      '10 min',
      '0 + 1',
    ]);
  });
});
