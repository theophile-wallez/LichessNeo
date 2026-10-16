import { Color, Mesh, MeshBasicMaterial, type BufferGeometry } from 'three';
import {
  FurMode,
  type Colors,
  type FurLook,
  type FurOptions,
} from '#content/coach/mascot/fur/fur.ts';
import type { CoachMood } from '#shared/coach.ts';
import type { MoodColors } from './character.ts';
import { solid, type Finish, type SolidMaterial } from './finishes.ts';
import { patterned } from './patterned.ts';

// A solid skin where the others have fur: the robot's glossy plastic, or
// another finish (cast/finishes.ts), each part in the color its fur would have
// had, and a robot's lights. Given other colors, it eases into them rather
// than switch, so the robot of one level turns into the next.

/** A robot's lights: lit parts, and the soft glow around them. */
export interface Lights {
  readonly glow: MeshBasicMaterial;
  readonly halo: MeshBasicMaterial;
}

// How fast it eases into new colors, per second.
const RECOLOR_RATE = 12;

// Unlit, and kept at full strength by the tone mapping.
const lit = (color: string, opacity = 1): MeshBasicMaterial =>
  new MeshBasicMaterial({
    color,
    toneMapped: false,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity === 1,
  });

/** The colors each material eases to: the coat's, the front's, the accent's, the light's. */
const targets = (colors: Colors): readonly Color[] => {
  const light = new Color(colors.light ?? colors.accent);
  return [new Color(colors.coat), new Color(colors.front), new Color(colors.accent), light, light];
};

export class Shell {
  readonly lights: Lights;
  readonly #finish: Finish;
  readonly #look: Pick<FurLook, 'uFront' | 'uStripes'>;
  readonly #coat: SolidMaterial;
  readonly #front: SolidMaterial;
  readonly #accent: SolidMaterial;
  /** In the order of `targets`. */
  readonly #materials: readonly (SolidMaterial | MeshBasicMaterial)[];
  /** The body's and the tails', in the pattern of their fur, and the parts' with their own accent. */
  readonly #patterned: SolidMaterial[] = [];
  #targets: readonly Color[];
  #colors: Colors;
  readonly #moods: MoodColors;
  #mood: CoachMood = 'neutral';

  constructor(
    colors: Colors,
    finish: Finish,
    look: Pick<FurLook, 'uFront' | 'uStripes'>,
    moods: MoodColors = {},
  ) {
    this.#colors = colors;
    this.#moods = moods;
    this.#finish = finish;
    this.#look = look;
    this.#coat = solid(finish, colors.coat);
    this.#front = solid(finish, colors.front);
    this.#accent = solid(finish, colors.accent);
    const light = colors.light ?? colors.accent;
    this.lights = { glow: lit(light), halo: lit(light, 0.28) };
    this.#materials = [this.#coat, this.#front, this.#accent, this.lights.glow, this.lights.halo];
    this.#targets = targets(colors);
  }

  mesh(geometry: BufferGeometry, { mode, tipFrom = 99, accent }: FurOptions): Mesh {
    if (mode === FurMode.front) return new Mesh(geometry, this.#front);
    if (mode === FurMode.accent && accent) {
      const material = solid(this.#finish, accent);
      this.#patterned.push(material);
      return new Mesh(geometry, material);
    }
    if (mode === FurMode.accent) return new Mesh(geometry, this.#accent);
    if (mode === FurMode.coat) return new Mesh(geometry, this.#coat);
    const palette = {
      coat: this.#coat.color,
      front: this.#front.color,
      accent: this.#accent.color,
    };
    const material = patterned({ finish: this.#finish, palette, look: this.#look, mode, tipFrom });
    this.#patterned.push(material);
    return new Mesh(geometry, material);
  }

  /** Eases into `colors`: the same robot, another level's. */
  recolor(colors: Colors): void {
    this.#colors = colors;
    this.show(this.#mood);
  }

  /** Eases into the colors it takes in `mood`, or back into its own. */
  show(mood: CoachMood): void {
    this.#mood = mood;
    this.#targets = targets(this.#moods[mood] ?? this.#colors);
  }

  update(dt: number): void {
    const step = 1 - Math.exp(-RECOLOR_RATE * dt);
    for (const [i, material] of this.#materials.entries()) {
      const target = this.#targets[i];
      if (target && !material.color.equals(target)) material.color.lerp(target, step);
    }
  }

  dispose(): void {
    for (const material of [...this.#materials, ...this.#patterned]) material.dispose();
  }
}
