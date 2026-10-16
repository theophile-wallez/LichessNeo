import { describe, expect, it } from 'vitest';
import { Spring } from '#content/coach/mascot/motion.ts';
import { Jumper } from './behaviour.ts';
import {
  ENTRANCE_KINDS,
  Entrance,
  type EntranceKind,
  nextEntrance,
  PICKED_ENTRANCES,
} from './entrance.ts';

const FRAME = 1 / 60;

interface Run {
  readonly entrance: Entrance;
  readonly jumper: Jumper;
  /** The deepest it was under the floor, the widest its hole opened, the most it spun and leaned. */
  readonly deepest: number;
  readonly widest: number;
  readonly spun: number;
  readonly leaned: number;
}

/** Plays `kind` from 2 units to the right until it's done, or 10 seconds. */
function enter(kind: EntranceKind): Run {
  const jumper = new Jumper(new Spring(240, 11));
  const entrance = new Entrance(kind, 2, jumper);
  let [deepest, widest, spun, leaned] = [0, 0, 0, 0];
  for (let time = 0; time < 10 && !entrance.done; time += FRAME) {
    jumper.step(time, FRAME);
    entrance.step(time, FRAME);
    deepest = Math.min(deepest, entrance.sink);
    widest = Math.max(widest, entrance.hole ?? 0);
    spun = Math.max(spun, Math.abs(entrance.spin));
    leaned = Math.max(leaned, Math.abs(entrance.tilt));
  }
  return { entrance, jumper, deepest, widest, spun, leaned };
}

describe('Entrance', () => {
  it.each(ENTRANCE_KINDS)('%s ends standing still in its place, facing ahead', kind => {
    const { entrance, jumper } = enter(kind);
    expect(entrance.done).toBe(true);
    expect([entrance.x, entrance.sink, entrance.tilt]).toEqual([0, 0, 0]);
    expect(jumper.height).toBe(0);
    expect(entrance.spin).toBeCloseTo(0, 5);
    expect(entrance.hole ?? 0).toBe(0);
  });

  it('rises out of a hole in the floor that opens, then closes behind it', () => {
    const run = enter('rise');
    expect(run.deepest).toBeLessThan(-2);
    expect(run.widest).toBeGreaterThan(0.9);
    expect(enter('drop').widest).toBe(0);
  });

  it('spins down from the sky, and slides in leaning back as it brakes', () => {
    expect(enter('spin').spun).toBeGreaterThan(Math.PI);
    expect(enter('drop').spun).toBe(0);
    expect(enter('slide').leaned).toBeGreaterThan(0.1);
  });
});

describe('nextEntrance', () => {
  it('picks among the extension’s entrances, never the last one again', () => {
    for (const last of PICKED_ENTRANCES)
      for (const random of [0, 0.5, 0.99]) {
        const next = nextEntrance(last, () => random);
        expect(PICKED_ENTRANCES).toContain(next);
        expect(next).not.toBe(last);
      }
  });
});
