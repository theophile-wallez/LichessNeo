import { between, damp, type Spring } from '#content/coach/mascot/motion.ts';

// What the mascot does on its own, as plain state over time: blinks, the
// mouth's syllables while it talks, hops under gravity, and glances around.
// `random` is injectable so tests can pin it.

const BLINK_SECONDS = 0.17;
const GRAVITY = 14;

/** How open the eyes are, from 0 to 1: a blink every few seconds, now and then a double one. */
export class Blinker {
  #at = 1.5;
  #starts: number[] = [];
  readonly #random: () => number;

  constructor(random: () => number = Math.random) {
    this.#random = random;
  }

  openness(time: number): number {
    if (time > this.#at) {
      this.#starts = [time];
      if (this.#random() < 0.2) this.#starts.push(time + 0.24);
      this.#at = time + between(2, 5.5, this.#random);
    }
    let open = 1;
    for (const start of this.#starts) {
      const progress = (time - start) / BLINK_SECONDS;
      if (progress > 0 && progress < 1) open = Math.min(open, Math.abs(progress * 2 - 1) ** 1.5);
    }
    return open;
  }
}

/** How far the mouth opens as it talks: syllables of their own length and loudness, a pause now and then. */
export class Talker {
  talking = false;
  #phase = 0;
  #rate = 12;
  #amount = 0.6;
  #open = 0;
  readonly #random: () => number;

  constructor(random: () => number = Math.random) {
    this.#random = random;
  }

  openness(dt: number): number {
    if (!this.talking && this.#open <= 0.01) return this.#open;
    const before = this.#phase;
    this.#phase += dt * this.#rate;
    const turn = Math.PI * 2;
    if (Math.floor(before / turn) !== Math.floor(this.#phase / turn)) {
      this.#rate = between(10, 15, this.#random);
      this.#amount = this.#random() < 0.14 ? 0 : between(0.35, 1, this.#random);
    }
    const wanted = this.talking ? (0.5 - 0.5 * Math.cos(this.#phase)) * this.#amount : 0;
    this.#open = damp(this.#open, wanted, 30, dt);
    return this.#open;
  }
}

/** A hop: it crouches, then leaves the ground a moment later and lands with a squash. */
export class Jumper {
  height = 0;
  velocity = 0;
  #pending: { readonly at: number; readonly strength: number } | null = null;
  readonly #squash: Spring;

  constructor(squash: Spring) {
    this.#squash = squash;
  }

  hop(time: number, strength: number): void {
    if (this.height > 0 || this.#pending) return;
    this.#squash.kick(-2.4);
    this.#pending = { at: time + 0.1, strength };
  }

  step(time: number, dt: number): void {
    if (this.#pending && time >= this.#pending.at) {
      this.velocity = this.#pending.strength;
      this.#pending = null;
    }
    if (this.velocity === 0 && this.height === 0) return;
    this.velocity -= GRAVITY * dt;
    this.height += this.velocity * dt;
    if (this.height > 0) return;
    this.#squash.kick(this.velocity * 0.7);
    this.height = 0;
    this.velocity = 0;
  }
}

export interface Gaze {
  readonly x: number;
  readonly y: number;
}

/** Where the eyes are going: the mood's spot, the pointer, or a glance around, mostly ahead. */
export class Glances {
  x = 0;
  y = 0;
  #target: Gaze = { x: 0, y: 0 };
  #pointerAt = -10;
  #wanderAt = 0;
  readonly #random: () => number;

  constructor(random: () => number = Math.random) {
    this.#random = random;
  }

  /** The pointer, from -1 to 1 each way. */
  pointTo(gaze: Gaze, time: number): void {
    this.#target = { x: Math.min(1, Math.max(-1, gaze.x)), y: Math.min(1, Math.max(-1, gaze.y)) };
    this.#pointerAt = time;
  }

  step(time: number, dt: number, moodLook: Gaze | null): void {
    if (moodLook) this.#target = moodLook;
    else if (time - this.#pointerAt > 2.5 && time > this.#wanderAt) {
      this.#wanderAt = time + between(1.2, 3.5, this.#random);
      const ahead = this.#random() < 0.45;
      this.#target = ahead
        ? { x: 0, y: 0 }
        : { x: between(-0.7, 0.7, this.#random), y: between(-0.4, 0.5, this.#random) };
    }
    this.x = damp(this.x, this.#target.x, 7, dt);
    this.y = damp(this.y, this.#target.y, 7, dt);
  }
}
