import { Color, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, type BufferGeometry } from 'three';
import { FurMode, type Colors, type FurModeValue } from '#content/coach/mascot/fur/fur.ts';

// A robot's skin: glossy plastic where the others have fur, each part in the
// color its fur would have had, and its lights. Given other colors, it eases
// into them rather than switch, so the robot of one level turns into the next.

/** A robot's lights: lit parts, and the soft glow around them. */
export interface Lights {
  readonly glow: MeshBasicMaterial;
  readonly halo: MeshBasicMaterial;
}

// How fast it eases into new colors, per second.
const RECOLOR_RATE = 12;

const plastic = (color: string): MeshPhysicalMaterial =>
  new MeshPhysicalMaterial({ color, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.1 });

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
  readonly #coat: MeshPhysicalMaterial;
  readonly #front: MeshPhysicalMaterial;
  readonly #accent: MeshPhysicalMaterial;
  /** In the order of `targets`. */
  readonly #materials: readonly (MeshPhysicalMaterial | MeshBasicMaterial)[];
  #targets: readonly Color[];

  constructor(colors: Colors) {
    this.#coat = plastic(colors.coat);
    this.#front = plastic(colors.front);
    this.#accent = plastic(colors.accent);
    const light = colors.light ?? colors.accent;
    this.lights = { glow: lit(light), halo: lit(light, 0.28) };
    this.#materials = [this.#coat, this.#front, this.#accent, this.lights.glow, this.lights.halo];
    this.#targets = targets(colors);
  }

  mesh(geometry: BufferGeometry, mode: FurModeValue): Mesh {
    if (mode === FurMode.front) return new Mesh(geometry, this.#front);
    return new Mesh(geometry, mode === FurMode.accent ? this.#accent : this.#coat);
  }

  /** Eases into `colors`: the same robot, another level's. */
  recolor(colors: Colors): void {
    this.#targets = targets(colors);
  }

  update(dt: number): void {
    const step = 1 - Math.exp(-RECOLOR_RATE * dt);
    for (const [i, material] of this.#materials.entries()) {
      const target = this.#targets[i];
      if (target && !material.color.equals(target)) material.color.lerp(target, step);
    }
  }

  dispose(): void {
    for (const material of this.#materials) material.dispose();
  }
}
