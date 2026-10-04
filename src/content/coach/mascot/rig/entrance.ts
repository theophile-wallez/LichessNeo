import type { CoachMood } from '#shared/coach.ts';
import { damp } from '#content/coach/mascot/motion.ts';
import type { Gaze, Jumper } from './behaviour.ts';

// How a mascot comes on stage: it drops from the sky, walks in from the side,
// or hops in. It's done once it has stood still in its place a moment, ready
// to say hello.

export const ENTRANCE_KINDS = ['drop', 'walk', 'hops'] as const;

export type EntranceKind = (typeof ENTRANCE_KINDS)[number];

/** An entrance other than `last`, at random. */
export function nextEntrance(
  last: EntranceKind | null,
  random: () => number = Math.random,
): EntranceKind {
  const others = ENTRANCE_KINDS.filter(kind => kind !== last);
  return others[Math.floor(random() * others.length)] ?? 'drop';
}

/** Its feet's height when it's let go: just above the full framing's top. */
const DROP_HEIGHT = 2.9;
const WALK_SPEED = 2.1;
const HOP_SPEED = 2.6;
const HOP_STRENGTH = 4.4;
/** Steps per unit walked. */
const STRIDE = 2.4;
/** Its turn toward where it's going: three quarters, so its face still shows. */
const TURN = 0.7;
const SETTLE_SECONDS = 0.2;

export class Entrance {
  readonly kind: EntranceKind;
  /** Its offset from its place, sideways. */
  x: number;
  /** The steps walked so far: its feet lift one after the other. */
  stride = 0;
  /** How much it walks, from 0 to 1, easing out as it stops. */
  gait = 0;
  /** Its turn toward where it's going, in radians. */
  turn = 0;
  readonly #heading: number;
  readonly #jumper: Jumper;
  #settled = 0;

  /** `from` is where it starts, sideways from its place; a drop starts above it. */
  constructor(kind: EntranceKind, from: number, jumper: Jumper) {
    this.kind = kind;
    this.x = kind === 'drop' ? 0 : from;
    this.#heading = -Math.sign(from);
    this.#jumper = jumper;
    if (kind === 'drop') jumper.drop(DROP_HEIGHT);
  }

  get done(): boolean {
    return this.#settled >= SETTLE_SECONDS;
  }

  /** The mood it comes in with, or null for the one it was given. */
  get mood(): CoachMood | null {
    if (this.kind === 'drop') return this.#jumper.resting ? null : 'shock';
    return this.kind === 'hops' && this.x !== 0 ? 'happy' : null;
  }

  /** Where it looks: ahead, while it's on its way. */
  get look(): Gaze | null {
    return this.x === 0 ? null : { x: this.#heading * 0.6, y: 0 };
  }

  step(time: number, dt: number): void {
    const moving = this.x !== 0;
    if (this.kind === 'walk' && moving) this.#walk(dt);
    if (this.kind === 'hops' && moving) this.#hop(time, dt);
    this.gait = damp(this.gait, this.kind === 'walk' && moving ? 1 : 0, 10, dt);
    this.turn = damp(this.turn, Math.abs(this.x) > 0.4 ? this.#heading * TURN : 0, 6, dt);
    const still = this.x === 0 && this.#jumper.resting && this.#jumper.velocity === 0;
    this.#settled = still ? this.#settled + dt : 0;
  }

  // It slows down over its last half unit.
  #walk(dt: number): void {
    const distance = Math.abs(this.x);
    const travelled = Math.min(distance, dt * WALK_SPEED * Math.min(1, 0.35 + distance * 1.3));
    this.#travel(travelled);
    this.stride += travelled * STRIDE;
  }

  // It moves only while it's off the ground.
  #hop(time: number, dt: number): void {
    if (this.#jumper.resting) this.#jumper.hop(time, HOP_STRENGTH);
    else if (this.#jumper.height > 0) this.#travel(Math.min(Math.abs(this.x), dt * HOP_SPEED));
  }

  #travel(distance: number): void {
    const left = Math.abs(this.x) - distance;
    this.x = left <= 1e-4 ? 0 : Math.sign(this.x) * left;
  }
}
