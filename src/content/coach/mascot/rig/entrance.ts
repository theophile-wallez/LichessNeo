import type { CoachMood } from '#shared/coach.ts';
import { damp, Spring } from '#content/coach/mascot/motion.ts';
import { GRAVITY, type Gaze, type Jumper } from './behaviour.ts';

// How a mascot comes on stage: it drops from the sky, walks in from the side,
// hops in, leaps out of a hole that opens in the floor and closes behind it,
// spins down from the sky or slides in and brakes. It's done once it has stood
// still in its place a moment, ready to say hello.

export const ENTRANCE_KINDS = ['drop', 'walk', 'hops', 'rise', 'spin', 'slide'] as const;

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
/** How deep under the floor a rise starts: all of it, ears too, out of sight. */
const RISE_DEPTH = 3;
/** How long its hole takes to open before it leaps out. */
const HOLE_SECONDS = 0.35;
/** How far its feet clear the floor before its hole closes, and how fast it does. */
const FEET_CLEAR = 0.05;
const CLOSE_SECONDS = 0.12;
/** Its leap's speed, out of the hole: it peaks about 0.7 over the floor, as a big hop does. */
const LEAP_SPEED = Math.sqrt(2 * GRAVITY * (RISE_DEPTH + 0.7));
/** Its spin per unit fallen, in radians: a turn from the top, landing facing ahead. */
const SPIN_PER_UNIT = (Math.PI * 2) / DROP_HEIGHT;
/** How fast a slide brakes, per second. */
const SLIDE_BRAKE = 3.4;
// What's left of a spring's motion once it has come to rest.
const AT_REST = 1e-3;

const resting = (spring: Spring, target: number): boolean =>
  Math.abs(spring.value - target) < AT_REST && Math.abs(spring.velocity) < AT_REST * 10;

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
  /** Its spin about itself, in radians, spinning down. */
  spin = 0;
  /** Its tilt sideways, in radians, braking at the end of a slide. */
  tilt = 0;
  readonly #heading: number;
  readonly #jumper: Jumper;
  // Under the floor for a rise, leaping out of its hole.
  #sink = 0;
  #leap: number | null = null;
  #closing = false;
  readonly #hole = new Spring(170, 13);
  #elapsed = 0;
  #settled = 0;

  /** `from` is where it starts, sideways from its place; a drop, spin or rise starts there. */
  constructor(kind: EntranceKind, from: number, jumper: Jumper) {
    this.kind = kind;
    const sideways = kind === 'walk' || kind === 'hops' || kind === 'slide';
    this.x = sideways ? from : 0;
    this.#heading = -Math.sign(from);
    this.#jumper = jumper;
    if (kind === 'drop' || kind === 'spin') jumper.drop(DROP_HEIGHT);
    this.#sink = kind === 'rise' ? -RISE_DEPTH : 0;
    this.#hole.target = kind === 'rise' ? 1 : 0;
  }

  get done(): boolean {
    return this.#settled >= SETTLE_SECONDS;
  }

  /** How far under the floor it is, rising: a negative height. */
  get sink(): number {
    return this.#sink;
  }

  /** How open its hole in the floor is, from 0 to 1, or null if it doesn't come out of one. */
  get hole(): number | null {
    return this.kind === 'rise' ? Math.max(0, this.#hole.value) : null;
  }

  /** The mood it comes in with, or null for the one it was given. */
  get mood(): CoachMood | null {
    const falling = !this.#jumper.resting;
    if (this.kind === 'drop') return falling ? 'shock' : null;
    if (this.kind === 'spin') return falling ? 'delight' : null;
    // Once out of the floor: a mood's hop can't push it out early.
    if (this.kind === 'rise') return this.#leap !== null && falling ? 'delight' : null;
    return (this.kind === 'hops' || this.kind === 'slide') && this.x !== 0 ? 'happy' : null;
  }

  /** Where it looks: ahead, while it's on its way. */
  get look(): Gaze | null {
    return this.x === 0 ? null : { x: this.#heading * 0.6, y: 0 };
  }

  step(time: number, dt: number): void {
    const moving = this.x !== 0;
    if (this.kind === 'walk' && moving) this.#walk(dt);
    if (this.kind === 'hops' && moving) this.#hop(time, dt);
    if (this.kind === 'slide') this.#slide(dt);
    if (this.kind === 'rise') this.#rise(dt);
    this.spin = this.kind === 'spin' ? this.#jumper.height * SPIN_PER_UNIT : 0;
    this.gait = damp(this.gait, this.kind === 'walk' && moving ? 1 : 0, 10, dt);
    const turning = this.kind !== 'slide' && Math.abs(this.x) > 0.4;
    this.turn = damp(this.turn, turning ? this.#heading * TURN : 0, 6, dt);
    this.#settled = this.#still ? this.#settled + dt : 0;
  }

  get #still(): boolean {
    const landed = this.#jumper.resting && this.#jumper.velocity === 0;
    const upright = Math.abs(this.tilt) < AT_REST;
    const out = this.#sink === 0 && resting(this.#hole, 0);
    return this.x === 0 && landed && upright && out;
  }

  // Its hole opens; it leaps out, handed to the jumper as it clears the floor; once its feet
  // are out, the hole snaps shut under it, well before it lands.
  #rise(dt: number): void {
    this.#elapsed += dt;
    if (this.#sink < 0) this.#leapOut(dt);
    if (this.#sink === 0 && this.#jumper.height > FEET_CLEAR) this.#closing = true;
    if (!this.#closing) {
      this.#hole.step(dt);
      return;
    }
    this.#hole.value = Math.max(0, this.#hole.value - dt / CLOSE_SECONDS);
    this.#hole.velocity = 0;
  }

  #leapOut(dt: number): void {
    if (this.#leap === null && this.#elapsed >= HOLE_SECONDS) this.#leap = LEAP_SPEED;
    if (this.#leap === null) return;
    this.#leap -= GRAVITY * dt;
    this.#sink += this.#leap * dt;
    if (this.#sink < 0) return;
    this.#jumper.drop(this.#sink);
    this.#jumper.velocity = this.#leap;
    this.#sink = 0;
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

  // It glides in fast and brakes, leaning back against its speed, then rocks upright.
  #slide(dt: number): void {
    const before = this.x;
    const next = damp(this.x, 0, SLIDE_BRAKE, dt);
    this.x = Math.abs(next) < 0.01 ? 0 : next;
    const speed = dt > 0 ? (before - this.x) / dt : 0;
    const lean = Math.min(0.35, Math.max(-0.35, -speed * 0.08));
    this.tilt = damp(this.tilt, lean, 12, dt);
    if (Math.abs(this.tilt) < AT_REST && this.x === 0) this.tilt = 0;
  }

  #travel(distance: number): void {
    const left = Math.abs(this.x) - distance;
    this.x = left <= 1e-4 ? 0 : Math.sign(this.x) * left;
  }
}
