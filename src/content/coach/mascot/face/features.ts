import {
  BufferGeometry,
  CapsuleGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type Object3D,
} from 'three';
import { noseGeometry } from '#content/coach/mascot/cast/shapes.ts';
import { mouthOutline, type MouthShape } from './mouth-outline.ts';

// The face's features: glossy black beads (eyes, nose, mouth) sitting on the
// fur, and brows that only show when the mood needs them.

const gloss = new MeshPhysicalMaterial({
  color: '#0c0b12',
  roughness: 0.22,
  clearcoat: 1,
  clearcoatRoughness: 0.04,
});
// The mouth is a wide flat patch once open: glossy like the eyes, it would mirror the
// room's lights and turn white as the head turns. Matte, it stays black.
const mouthMaterial = new MeshStandardMaterial({
  color: '#0c0b12',
  roughness: 0.9,
  envMapIntensity: 0.05,
});
const tongueMaterial = new MeshPhysicalMaterial({
  color: '#e0566e',
  roughness: 0.45,
  clearcoat: 0.6,
});
const sparkle = new MeshBasicMaterial({ color: '#ffffff' });
const white = new MeshPhysicalMaterial({
  color: '#ffffff',
  roughness: 0.25,
  clearcoat: 1,
  clearcoatRoughness: 0.08,
});
export const blush = new MeshStandardMaterial({
  color: '#ff8fa3',
  roughness: 1,
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
});

const LIPS = {
  depth: 0.01,
  bevelEnabled: true,
  bevelThickness: 0.012,
  bevelSize: 0.008,
  bevelSegments: 4,
};
const TONGUE = {
  depth: 0.006,
  bevelEnabled: true,
  bevelThickness: 0.006,
  bevelSize: 0.004,
  bevelSegments: 3,
};

export class Mouth {
  readonly group = new Group();
  readonly #lips = new Mesh(new BufferGeometry(), mouthMaterial);
  readonly #tongue = new Mesh(new BufferGeometry(), tongueMaterial);
  #key = '';

  constructor() {
    this.#tongue.position.z = 0.014;
    this.group.add(this.#lips, this.#tongue);
  }

  /** Rebuilds the mouth when its shape changes enough to show. */
  set(shape: MouthShape): void {
    const key = [shape.width, shape.smile, shape.open, shape.skew]
      .map(value => value.toFixed(3))
      .join();
    if (key === this.#key) return;
    this.#key = key;
    const { points, lowest } = mouthOutline(shape);
    this.#lips.geometry.dispose();
    this.#lips.geometry = new ExtrudeGeometry(
      new Shape(points.map(([x, y]) => new Vector2(x, y))),
      LIPS,
    );
    this.#tongue.geometry.dispose();
    const tongueHeight = shape.open * 0.032;
    this.#tongue.visible = tongueHeight > 0.006;
    if (!this.#tongue.visible) return;
    const tongue = new Shape();
    tongue.absellipse(
      0,
      lowest + tongueHeight + 0.008,
      shape.width * 0.2,
      tongueHeight,
      0,
      Math.PI * 2,
    );
    this.#tongue.geometry = new ExtrudeGeometry(tongue, TONGUE);
  }
}

/** A plain bead, a white with a pupil that looks around, or an insect's bead with two glints. */
export type EyeStyle = 'bead' | 'big' | 'insect';

export interface Eye {
  readonly group: Group;
  /** What blinks and grows. */
  readonly bead: Object3D;
  /** Shut happy eyes: an arch, like ^ ^. */
  readonly arch: Mesh;
  readonly pupil: Mesh | null;
}

function glint(radius: number, x: number, y: number, z: number): Mesh {
  const mesh = new Mesh(new SphereGeometry(radius, 12, 8), sparkle);
  mesh.position.set(x, y, z);
  return mesh;
}

function bigBead(): { bead: Group; pupil: Mesh } {
  const bead = new Group();
  bead.add(new Mesh(new SphereGeometry(0.052, 32, 24), white));
  // A lens on the white rather than a ball inside it, so their edges never cross.
  const pupil = new Mesh(new SphereGeometry(0.034, 28, 20), gloss);
  pupil.scale.z = 0.3;
  pupil.add(glint(0.009, -0.012, 0.014, 0.02));
  bead.add(pupil);
  return { bead, pupil };
}

export function eye(style: EyeStyle): Eye {
  const group = new Group();
  let bead: Object3D;
  let pupil: Mesh | null = null;
  if (style === 'big') ({ bead, pupil } = bigBead());
  else {
    bead = new Mesh(new SphereGeometry(0.052, 32, 24), gloss);
    bead.add(glint(0.011, -0.017, 0.02, 0.028));
    if (style === 'insect') bead.add(glint(0.006, 0.014, -0.016, 0.03));
  }
  const arch = new Mesh(new TorusGeometry(0.042, 0.012, 10, 28, Math.PI), gloss);
  arch.position.y = -0.02;
  group.add(bead, arch);
  return { group, bead, arch, pupil };
}

export function brow(material: MeshStandardMaterial): Group {
  const group = new Group();
  const bar = new Mesh(new CapsuleGeometry(0.017, 0.075, 6, 12), material);
  bar.rotation.z = Math.PI / 2;
  group.add(bar);
  return group;
}

/** A button nose, or a dinosaur's two nostrils. */
export type NoseKind = 'button' | 'nostrils';

export function nose(kind: NoseKind, size: number): Object3D {
  if (kind === 'button') {
    const mesh = new Mesh(noseGeometry(), gloss);
    mesh.scale.setScalar(size);
    return mesh;
  }
  const group = new Group();
  for (const side of [-1, 1]) {
    const nostril = new Mesh(new SphereGeometry(0.016, 12, 8), gloss);
    nostril.scale.set(1.2, 0.8, 0.5);
    nostril.position.x = side * 0.045 * size;
    group.add(nostril);
  }
  return group;
}
