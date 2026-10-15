import type { BufferGeometry, Object3D } from 'three';
import type { CoachMood } from '#shared/coach.ts';
import type { Finish } from './finishes.ts';
import type { FaceLook } from '#content/coach/mascot/face/face.ts';
import type { Colors } from '#content/coach/mascot/fur/fur.ts';
import type { ArmsLook, EarsLook, FeetLook, RigBuilder } from '#content/coach/mascot/rig/limbs.ts';

// What a mascot is made of: a furry body (or a robot's plastic one) with a face
// laid on it, optional ears, arms and feet, and extras (a collar, a tail,
// plates) that may move on their own.

export interface BodyLook {
  readonly geometry: () => BufferGeometry;
  /** The skin the face slides over, coarser: a geometry, or meshes already placed. */
  readonly surface: () => BufferGeometry | Object3D;
  /** Its lowest point, set on the ground. */
  readonly bottom: number;
  readonly fur: number;
}

/** A part that moves on its own, every frame. */
export interface PartMotion {
  readonly update: (time: number, mood: CoachMood) => void;
}

export interface Character {
  readonly name: string;
  /** Fur, or a solid finish in the same colors, as the robot's glossy plastic (cast/shell.ts). */
  readonly skin: 'fur' | Finish;
  readonly colors: Colors;
  /** Where the front color starts on the body, at its bottom and at its top. */
  readonly frontMask: readonly [number, number];
  /** A bee's bands: how many per unit of height, and between which heights. */
  readonly stripes: readonly [number, number, number];
  readonly body: BodyLook;
  readonly face: FaceLook;
  readonly ears: EarsLook | null;
  readonly arms: ArmsLook | null;
  readonly feet: FeetLook | null;
  /** How high one without feet floats over the ground, bobbing; none stands on it. */
  readonly hover?: number;
  /** How far up the bust framing moves for it, its face off the egg's height. */
  readonly bust?: number;
  readonly extras: (rig: RigBuilder) => PartMotion | null;
}
