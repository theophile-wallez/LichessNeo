import type { CoachMood } from '#shared/coach.ts';
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
import type { Lights } from '#content/coach/mascot/cast/shell.ts';
import { FurMode, type FurModeValue, type FurOptions } from '#content/coach/mascot/fur/fur.ts';
import { MOODS } from '#content/coach/mascot/moods.ts';
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
  /** Where the head they stand on faces, in radians about the vertical: a head turned three quarters. */
  readonly turn?: number;
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

/** What a part needs: the body to hang on, and a furry mesh that bends (a robot's: plastic). */
export interface RigBuilder {
  readonly body: Group;
  readonly fur: (geometry: BufferGeometry, options: FurOptions, probe?: Vector3) => Mesh;
  /** A robot's lights, which ease to another level's colors with its plastic. */
  readonly lights: () => Lights;
}

export interface Ear {
  readonly pivot: Group;
  readonly side: number;
  readonly tilt: number;
  readonly twitch: Spring;
}

export interface Foot {
  readonly mesh: Mesh;
  readonly side: number;
  /** Its height standing. */
  readonly rest: number;
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
  const head = new Group();
  head.rotation.y = ears.turn ?? 0;
  rig.body.add(head);
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
    head.add(pivot);
    return { pivot, side, tilt: ears.tilt, twitch: new Spring(260, 9) };
  });
}

// In an arc round the pad's end: the middle toes farthest from it.
const TOES: readonly (readonly [number, number])[] = [
  [-0.075, -0.012],
  [-0.026, -0.038],
  [0.026, -0.038],
  [0.075, -0.012],
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
export function buildFeet(rig: RigBuilder, ground: Group, feet: FeetLook | null): Foot[] {
  if (!feet) return [];
  const geometry = footGeometry();
  return SIDES.map(side => {
    const mesh = rig.fur(geometry, { layers: 10, length: 0.04, mode: feet.mode, density: 80 });
    const [x, y, z] = feet.position;
    mesh.position.set(side * x, y, z);
    mesh.scale.setScalar(feet.scale);
    ground.add(mesh);
    return { mesh, side, rest: y };
  });
}

/** The feet lift one after the other, `stride` steps into a walk, as much as `gait`. */
export function stepFeet(feet: readonly Foot[], stride: number, gait: number): void {
  const swing = Math.sin(stride * Math.PI);
  for (const { mesh, side, rest } of feet)
    mesh.position.y = rest + Math.max(0, swing * side) * 0.16 * gait;
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

/** Leans the ears out as they rest, drooped as the mood has them, a twitch springing back. */
export function swayEars(ears: readonly Ear[], droop: number, dt: number): void {
  for (const { pivot, side, tilt, twitch } of ears) {
    pivot.rotation.z = -side * (tilt + 0.5 * droop + twitch.step(dt) * 0.1);
    pivot.rotation.x = -Math.max(droop, 0) * 0.45;
  }
}

export interface ArmsMotion {
  readonly time: number;
  readonly dt: number;
  readonly mood: CoachMood;
  /** How much the left arm waves hello, from 0 to 1. */
  readonly wave: number;
  /** The walk's sway, from -1 to 1. */
  readonly swing: number;
}

/** Points the arms as the mood holds them, flapping with delight, swinging as it walks. */
export function aimArms(arms: readonly Arm[], motion: ArmsMotion, rotation: Matrix4): void {
  const { time, dt, mood, wave, swing } = motion;
  const pose = MOODS[mood].arms;
  const wanted = new Vector3();
  for (const arm of arms) {
    wanted.fromArray(arm.side < 0 ? pose.left : pose.right);
    if (mood === 'delight') wanted.x += Math.sin(time * 15 + arm.side) * 0.18;
    wanted.z += arm.side * swing * 0.4;
    if (arm.side < 0 && wave > 0.01) {
      const angle = -0.5 + Math.sin(time * 11) * 0.32;
      wanted.lerp(new Vector3(Math.sin(angle), Math.cos(angle), 0.25), wave);
    }
    arm.direction.lerp(wanted.normalize(), 1 - Math.exp(-10 * dt)).normalize();
    arm.pivot.quaternion.setFromRotationMatrix(palmForward(arm.direction, rotation));
  }
}
