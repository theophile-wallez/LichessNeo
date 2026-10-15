import { Group, Mesh, Raycaster, Vector3, type BufferGeometry } from 'three';
import type { CoachMood } from '#shared/coach.ts';
import { FurMode, type FurModeValue } from '#content/coach/mascot/fur/fur.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';
import type { PartMotion } from './character.ts';
import { bodyGeometry, plateGeometry } from './shapes.ts';

// Extras hung on a mascot's body: tails, plates, and what sways. Each adds its
// meshes to the body and may return its motion, run every frame.

const UP = new Vector3(0, 1, 0);

type Triple = readonly [number, number, number];

/** Happy mascots wag and sway faster. */
export const lively = (mood: CoachMood): number =>
  mood === 'happy' || mood === 'delight' ? 2.4 : 1;

/** Runs every part's motion. */
export const together = (...parts: readonly (PartMotion | null)[]): PartMotion => ({
  update: (time, mood) => {
    for (const part of parts) part?.update(time, mood);
  },
});

/** Something on a pivot that sways around `axis` from where it was put. */
export function swaying(
  pivot: Group,
  sway: {
    readonly axis: 'x' | 'y' | 'z';
    readonly amount: number;
    readonly speed: number;
    readonly offset: number;
  },
): PartMotion {
  const rest = pivot.rotation[sway.axis];
  return {
    update: (time, mood) => {
      pivot.rotation[sway.axis] =
        rest + Math.sin(time * sway.speed * lively(mood) + sway.offset) * sway.amount;
    },
  };
}

export interface TailLook {
  readonly geometry: BufferGeometry;
  readonly position: Triple;
  readonly rotation: Triple;
  readonly tipFrom?: number;
  readonly mode?: FurModeValue;
}

export interface Tail extends PartMotion {
  readonly pivot: Group;
}

/** A tail behind the body that sways, faster when the mascot is happy. */
export function tail(rig: RigBuilder, look: TailLook): Tail {
  const pivot = new Group();
  pivot.position.set(...look.position);
  pivot.rotation.set(...look.rotation);
  const options = {
    layers: 16,
    length: 0.05,
    mode: look.mode ?? FurMode.coat,
    tipFrom: look.tipFrom ?? 99,
  };
  pivot.add(rig.fur(look.geometry, options, new Vector3(0, 0.6, 0)));
  rig.body.add(pivot);
  let phase = 0;
  let last = 0;
  return {
    pivot,
    update: (time, mood) => {
      phase += (time - last) * 2.6 * lively(mood);
      last = time;
      pivot.rotation.z = look.rotation[2] + Math.sin(phase) * 0.16 * lively(mood);
    },
  };
}

function plate(rig: RigBuilder, size: number): Mesh {
  const mesh = rig.fur(plateGeometry(), { layers: 10, length: 0.025, mode: FurMode.accent });
  mesh.scale.setScalar(size);
  return mesh;
}

/** Plates down a dinosaur's back, by angle over the top, side and size: a middle row,
 *  and pairs either side that show past the head. */
const CREST: readonly Triple[] = [
  [-0.12, 0, 0.8],
  [0.32, -0.32, 1.1],
  [0.32, 0.32, 1.1],
  [0.72, 0, 1.4],
  [1.15, -0.3, 1.1],
  [1.15, 0.3, 1.1],
  [1.6, 0, 0.9],
];

export function crest(rig: RigBuilder): void {
  const skin = new Mesh(bodyGeometry(48, 36));
  for (const [angle, side, size] of CREST) {
    const hit = hitSkin(skin, new Vector3(side, Math.cos(angle), -Math.sin(angle)));
    if (!hit) continue;
    const mesh = plate(rig, size);
    mesh.position.copy(hit.point).addScaledVector(hit.normal, -0.03);
    mesh.quaternion.setFromUnitVectors(UP, hit.normal);
    rig.body.add(mesh);
  }
  skin.geometry.dispose();
}

const ray = new Raycaster();

/** Where `skin` is seen from far out along `outward`, and its normal there, or null if it isn't. */
export function hitSkin(skin: Mesh, outward: Vector3): { point: Vector3; normal: Vector3 } | null {
  const direction = outward.clone().normalize();
  ray.set(direction.clone().multiplyScalar(4), direction.negate());
  const [hit] = ray.intersectObject(skin);
  return hit?.face ? { point: hit.point, normal: hit.face.normal } : null;
}

/** Plates along a tail's top: its +x is up once it's turned out to the side. */
export function tailPlates(rig: RigBuilder, pivot: Group, length: number): void {
  const up = new Vector3(1, 0.25, 0).normalize();
  for (const [along, x, size] of [
    [0.25, 0.24, 1.3],
    [0.47, 0.2, 1.1],
    [0.67, 0.12, 0.85],
  ] as const) {
    const mesh = plate(rig, size);
    mesh.position.set(x, along * length, 0);
    mesh.quaternion.setFromUnitVectors(UP, up);
    pivot.add(mesh);
  }
}

/** The ring under a pawn's head. */
export function collar(rig: RigBuilder, geometry: BufferGeometry): PartMotion | null {
  const mesh = rig.fur(geometry, { layers: 12, length: 0.035, mode: FurMode.accent });
  mesh.position.y = 0.07;
  rig.body.add(mesh);
  return null;
}
