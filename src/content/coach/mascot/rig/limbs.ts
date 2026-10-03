import {
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type Matrix4,
} from 'three';
import { ARM_LENGTH, armGeometry, footGeometry } from '#content/coach/mascot/cast/shapes.ts';
import { FurMode, type FurModeValue, type FurOptions } from '#content/coach/mascot/fur/fur.ts';
import { Spring } from '#content/coach/mascot/motion.ts';

// The mascot's ears, arms and feet, built on its body.

type Triple = readonly [number, number, number];

export interface EarsLook {
  readonly geometry: () => BufferGeometry;
  readonly position: Triple;
  /** Their lean out to the sides, at rest. */
  readonly tilt: number;
  readonly lift: number;
  readonly fur: number;
  /** A pale inner ear. */
  readonly inner: boolean;
}

export interface ArmsLook {
  readonly position: Triple;
  readonly scale: number;
  /** The paw pads' color, or null for a plain mitten. */
  readonly pads: string | null;
}

export interface FeetLook {
  readonly position: Triple;
  readonly scale: number;
  readonly mode: FurModeValue;
}

/** What a part needs from the rig: the body to hang on, and a furry mesh that bends as it moves. */
export interface RigBuilder {
  readonly body: Group;
  readonly fur: (geometry: BufferGeometry, options: FurOptions, probe?: Vector3) => Mesh;
}

export interface Ear {
  readonly pivot: Group;
  readonly side: number;
  readonly tilt: number;
  readonly twitch: Spring;
}

export interface Arm {
  readonly pivot: Group;
  readonly side: number;
  /** From shoulder to paw, eased toward the mood's. */
  readonly direction: Vector3;
}

const SIDES = [-1, 1] as const;

export function buildEars(rig: RigBuilder, ears: EarsLook | null): Ear[] {
  if (!ears) return [];
  return SIDES.map(side => {
    const pivot = new Group();
    const [x, y, z] = ears.position;
    pivot.position.set(side * x, y, z);
    const ear = rig.fur(ears.geometry(), {
      layers: 14,
      length: ears.fur,
      mode: FurMode.coat,
      density: 80,
    });
    ear.position.y = ears.lift;
    pivot.add(ear);
    if (ears.inner) {
      const inner = rig.fur(ears.geometry(), {
        layers: 6,
        length: 0.015,
        mode: FurMode.accent,
        density: 90,
      });
      inner.scale.set(0.62, 0.78, 0.5);
      inner.position.set(0, ears.lift + 0.04, 0.05);
      pivot.add(inner);
    }
    rig.body.add(pivot);
    return { pivot, side, tilt: ears.tilt, twitch: new Spring(260, 9) };
  });
}

const TOES: readonly (readonly [number, number])[] = [
  [-0.075, -0.04],
  [-0.026, -0.025],
  [0.026, -0.025],
  [0.075, -0.04],
];

function paw(arm: Group, material: MeshStandardMaterial): void {
  const pad = new Mesh(new SphereGeometry(0.075, 24, 16), material);
  pad.scale.set(1, 1.15, 0.35);
  pad.position.set(0, -ARM_LENGTH + 0.21, 0.19);
  arm.add(pad);
  for (const [x, y] of TOES) {
    const toe = new Mesh(new SphereGeometry(0.022, 16, 12), material);
    toe.scale.set(1, 1.15, 0.45);
    // On the paw's rounded tip.
    toe.position.set(x, -ARM_LENGTH + 0.12 + y, Math.sqrt(0.16 ** 2 - x * x) + 0.008);
    arm.add(toe);
  }
}

export function buildArms(rig: RigBuilder, arms: ArmsLook | null): Arm[] {
  if (!arms) return [];
  const geometry = armGeometry();
  const pads =
    arms.pads === null ? null : new MeshStandardMaterial({ color: arms.pads, roughness: 0.85 });
  return SIDES.map(side => {
    const pivot = new Group();
    const [x, y, z] = arms.position;
    pivot.position.set(side * x, y, z);
    pivot.scale.setScalar(arms.scale);
    const options = { layers: 16, length: 0.055, mode: FurMode.coat, palm: pads !== null };
    pivot.add(rig.fur(geometry, options, new Vector3(0, -0.4, 0)));
    if (pads) paw(pivot, pads);
    rig.body.add(pivot);
    return { pivot, side, direction: new Vector3(side * 0.42, -0.88, 0.3).normalize() };
  });
}

/** Feet stand under the body, outside its squash. */
export function buildFeet(rig: RigBuilder, ground: Group, feet: FeetLook | null): void {
  if (!feet) return;
  const geometry = footGeometry();
  for (const side of SIDES) {
    const foot = rig.fur(geometry, { layers: 10, length: 0.04, mode: feet.mode, density: 80 });
    const [x, y, z] = feet.position;
    foot.position.set(side * x, y, z);
    foot.scale.setScalar(feet.scale);
    ground.add(foot);
  }
}

const FORWARD = new Vector3(0, 0, 1);
const UP = new Vector3(0, 1, 0);

/** The arm's rotation along `direction`, its palm turned to the viewer as far as it can. */
export function palmForward(direction: Vector3, into: Matrix4): Matrix4 {
  const along = direction.clone().negate();
  const facing = Math.abs(along.dot(FORWARD)) > 0.9 ? UP.clone() : FORWARD.clone();
  facing.addScaledVector(along, -facing.dot(along)).normalize();
  const side = new Vector3().crossVectors(along, facing);
  return into.makeBasis(side, along, facing);
}
