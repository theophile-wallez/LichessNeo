// Easing and springs for the mascot's motion, frame-rate independent.

/** Eases `current` toward `target` at `rate` per second. */
export const damp = (current: number, target: number, rate: number, dt: number): number =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

/** A number between `min` and `max`, from `random` (0 to 1). */
export const between = (min: number, max: number, random: () => number = Math.random): number =>
  min + random() * (max - min);

// Stepped at 120 Hz at least, so a long frame doesn't blow it up.
const SUBSTEP = 1 / 120;

/** An amount easing at `rate` toward the target it's given each frame, from 0. */
export function easing(rate: number): (time: number, target: number) => number {
  let amount = 0;
  let last = 0;
  return (time, target) => {
    amount = damp(amount, target, rate, time - last);
    last = time;
    return amount;
  };
}

/** A damped spring around `target`: kick it and it wobbles back. */
export class Spring {
  value = 0;
  velocity = 0;
  target = 0;
  readonly #stiffness: number;
  readonly #damping: number;

  constructor(stiffness: number, damping: number) {
    this.#stiffness = stiffness;
    this.#damping = damping;
  }

  kick(velocity: number): void {
    this.velocity += velocity;
  }

  step(dt: number): number {
    const steps = Math.max(1, Math.ceil(dt / SUBSTEP));
    const slice = dt / steps;
    for (let i = 0; i < steps; i++) {
      const force = this.#stiffness * (this.target - this.value) - this.#damping * this.velocity;
      this.velocity += force * slice;
      this.value += this.velocity * slice;
    }
    return this.value;
  }
}
