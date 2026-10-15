import { TorusGeometry } from 'three';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';
import type { Character } from './character.ts';
import { latheGeometry, softBox, type Profile } from './shapes.ts';

// A chess rook, the pawn's family: a stout drum on a flared base, a crown of
// battlements on top, its face on the drum.

const PROFILE: Profile = [
  [0.001, -1],
  [0.74, -1],
  [0.8, -0.93],
  [0.76, -0.8],
  [0.6, -0.7],
  [0.55, -0.45],
  [0.54, 0.4],
  [0.58, 0.62],
  [0.7, 0.72],
  [0.72, 0.9],
  [0.66, 0.95],
  [0.001, 0.95],
];

const rookGeometry = (columns = 96) => latheGeometry(PROFILE, columns);

// Six around the rim: three show head-on, and the back ones between them.
const MERLONS = 6;

/** The battlements, and a band round the waist. */
function crown(rig: RigBuilder): null {
  const merlon = softBox([0.2, 0.17, 0.14], 3.5, 0, 20);
  for (let i = 0; i < MERLONS; i++) {
    const angle = (i / MERLONS) * Math.PI * 2;
    const mesh = rig.fur(merlon, { layers: 12, length: 0.03, mode: FurMode.coat });
    mesh.position.set(Math.sin(angle) * 0.56, 1.08, Math.cos(angle) * 0.56);
    mesh.rotation.y = angle;
    rig.body.add(mesh);
  }
  const ring = new TorusGeometry(0.6, 0.05, 12, 72);
  ring.rotateX(Math.PI / 2);
  const band = rig.fur(ring, { layers: 10, length: 0.025, mode: FurMode.accent });
  band.position.y = -0.7;
  rig.body.add(band);
  return null;
}

export const rook: Character = {
  name: 'Tour',
  skin: 'ceramic',
  colors: { coat: '#9db4ff', front: '#c3d1ff', accent: '#6d86e8' },
  frontMask: [0.85, 0.75],
  stripes: [0, 0, 0],
  body: { geometry: () => rookGeometry(), surface: () => rookGeometry(48), bottom: -1, fur: 0.05 },
  face: {
    center: [0, 0.25],
    size: [0.42, 0.32],
    slide: { x: [-0.5, 0.5], y: [-0.3, 0.6] },
    eyes: { x: 0.19, y: 0.32, size: 1.15 },
    brows: { y: 0.46, color: '#3a4a8c' },
    nose: null,
    mouth: { y: 0.17, scale: 1 },
    cheeks: { x: 0.33, y: 0.2 },
  },
  ears: null,
  arms: { position: [0.56, -0.1, 0.08], scale: 0.62, pads: null },
  feet: null,
  extras: crown,
};
