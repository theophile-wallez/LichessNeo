import { TorusGeometry, type BufferGeometry, type Group } from 'three';
import type { CoachMood } from '#shared/coach.ts';
import type { PartMotion } from './character.ts';
import { lively } from './parts.ts';
import { latheGeometry, reshape, type Profile } from './shapes.ts';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';
import { Spring } from '#content/coach/mascot/motion.ts';

// What the chess coaches share with the pawn (cast/shapes.ts): its flared foot
// under each piece's own body, a ring in the accent, and a topper that
// wobbles, hopping off the piece when the mascot is jolted.

/** The pawn's foot, up to where each piece's waist starts. */
export const PIECE_FOOT: Profile = [
  [0.001, -1],
  [0.6, -1],
  [0.8, -0.93],
  [0.84, -0.8],
  [0.72, -0.66],
];

/** A piece turned from the pawn's foot up through its own `body`. */
export const pieceGeometry = (body: Profile, columns = 96): BufferGeometry =>
  latheGeometry([...PIECE_FOOT, ...body], columns);

/** A flattened ring in the accent, as the pawn's collar under its head, on `parent` or the body. */
export function pieceRing(
  rig: RigBuilder,
  ring: { readonly radius: number; readonly y: number; readonly thickness: number },
  parent: Group = rig.body,
): void {
  const geometry = new TorusGeometry(ring.radius, ring.thickness, 16, 72);
  geometry.rotateX(Math.PI / 2);
  const flat = reshape(geometry, vertex => {
    vertex.y *= 0.75;
  });
  const mesh = rig.fur(flat, { layers: 12, length: 0.035, mode: FurMode.accent });
  mesh.position.y = ring.y;
  parent.add(mesh);
}

/** Moods that jolt a topper off its head. */
const JOLTS: ReadonlySet<CoachMood> = new Set(['shock', 'delight', 'surprise']);

const GRAVITY = 9;
// Below this speed a landing doesn't bounce again.
const SETTLE = 0.4;

/** A topper on `pivot` that sways and wobbles back, hopping when the mood jolts it. */
export function wobbly(
  pivot: Group,
  look: {
    readonly sway: number;
    /** How fast it leaves the head when jolted, up. */
    readonly hop: number;
  },
): PartMotion {
  const rest = pivot.position.y;
  const tilt = new Spring(120, 4.5);
  let lift = 0;
  /** Its speed up, falling back. */
  let rise = 0;
  let last = 0;
  let shown: CoachMood = 'neutral';
  return {
    update: (time, mood) => {
      const dt = Math.min(time - last, 0.1);
      last = time;
      if (mood !== shown) {
        shown = mood;
        if (JOLTS.has(mood)) rise = look.hop;
        tilt.kick(JOLTS.has(mood) ? 6 : 2);
      }
      rise -= GRAVITY * dt;
      lift += rise * dt;
      if (lift < 0) {
        lift = 0;
        rise = Math.abs(rise) > SETTLE ? -rise * 0.35 : 0;
      }
      pivot.rotation.z = Math.sin(time * 2.1 * lively(mood)) * look.sway + tilt.step(dt) * 0.12;
      pivot.position.y = rest + lift;
    },
  };
}
