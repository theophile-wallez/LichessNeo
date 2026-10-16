import { Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';
import type { Character, PartMotion } from './character.ts';
import { hitSkin } from './parts.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';
import { slimeExtras } from './slime-parts.ts';
import { SLIME_BOTTOM, slimeGeometry } from './slime-shape.ts';

// A little slime: a drop of see-through jelly settled on the ground, its darker
// heart showing through, that wobbles and takes its moods in the jelly itself.
// It has no arms: it says hello by wobbling.

const shine = new MeshBasicMaterial({
  color: '#ffffff',
  transparent: true,
  opacity: 0.85,
  depthWrite: false,
});

const UP = new Vector3(0, 1, 0);

/** The shine on its dome, by where it shows on the skin and its size. */
const GLINTS: readonly (readonly [Vector3, readonly [number, number]])[] = [
  [new Vector3(-0.5, 0.7, 0.5), [0.22, 0.09]],
  [new Vector3(-0.22, 0.95, 0.42), [0.045, 0.045]],
];

/** Flat glints laid on the skin, in the body so they squish with it. */
function glints(rig: RigBuilder): void {
  const skin = new Mesh(slimeGeometry(48));
  const disc = new SphereGeometry(1, 24, 12);
  for (const [outward, [width, height]] of GLINTS) {
    const hit = hitSkin(skin, outward);
    if (!hit) continue;
    const mesh = new Mesh(disc, shine);
    mesh.position.copy(hit.point).addScaledVector(hit.normal, 0.004);
    mesh.quaternion.setFromUnitVectors(UP, hit.normal);
    // Leaning along the dome, the long shine following its curve.
    mesh.rotateY(0.7);
    mesh.scale.set(width, 0.004, height);
    mesh.renderOrder = 2;
    rig.body.add(mesh);
  }
  skin.geometry.dispose();
}

function extras(rig: RigBuilder): PartMotion {
  glints(rig);
  return slimeExtras(rig);
}

const HEART = { coat: '#17b08a', front: '#17b08a', accent: '#ff8fb1' };

export const slime: Character = {
  name: 'Slime',
  skin: 'jelly',
  // Its heart's: the jelly over it is drawn by its extras (slime-parts.ts).
  colors: HEART,
  moodColors: {
    angry: { ...HEART, coat: '#d8322a', front: '#d8322a' },
    shy: { ...HEART, coat: '#f2588e', front: '#f2588e' },
  },
  frontMask: [2, 2],
  stripes: [0, 0, 0],
  body: {
    // Its heart, a rim of jelly round it; its face is on the jelly's skin.
    geometry: () => slimeGeometry(64, 0.84, -0.3),
    surface: () => slimeGeometry(48),
    bottom: SLIME_BOTTOM,
    fur: 0.04,
  },
  face: {
    center: [0, -0.2],
    size: [0.5, 0.36],
    slide: { x: [-0.6, 0.6], y: [-0.7, 0.4] },
    eyes: { x: 0.25, y: -0.12, size: 1.45 },
    brows: { y: 0.04, color: '#1f7a62' },
    nose: null,
    mouth: { y: -0.28, scale: 1.05 },
    cheeks: { x: 0.4, y: -0.22 },
  },
  ears: null,
  arms: null,
  feet: null,
  bust: -0.6,
  extras,
};
