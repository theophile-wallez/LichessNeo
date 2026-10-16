import { Mesh, MeshPhysicalMaterial, SphereGeometry } from 'three';
import type { Character, PartMotion } from './character.ts';
import { BODY_BOTTOM, bodyGeometry, noseGeometry, reshape } from './shapes.ts';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';

// A baby bunny: a powder blue egg with a white belly, long soft ears pink
// inside, a pink nose and a pompom tail.

const COLORS = { coat: '#a7c7f2', front: '#f7faff', accent: '#ff8fb5' };

/** A long ear, flat front to back and widest past its middle, standing on the origin. */
function earGeometry() {
  return reshape(new SphereGeometry(1, 32, 24), vertex => {
    const along = (vertex.y + 1) / 2;
    const width = 0.75 + 0.4 * Math.sin(Math.PI * along ** 0.8);
    vertex.x *= 0.13 * width;
    vertex.z *= 0.07 * width;
    vertex.y = along * 0.82;
  });
}

function nose(): Mesh {
  const material = new MeshPhysicalMaterial({
    color: '#ff7f9f',
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  });
  const mesh = new Mesh(noseGeometry(), material);
  mesh.scale.setScalar(0.62);
  return mesh;
}

/** A round white pompom low on its back, wiggling. */
function pompom(rig: RigBuilder): PartMotion {
  const mesh = rig.fur(new SphereGeometry(0.2, 32, 20), {
    layers: 16,
    length: 0.08,
    mode: FurMode.front,
  });
  mesh.position.set(0, -0.55, -0.74);
  rig.body.add(mesh);
  return {
    update: (time, mood) => {
      const happy = mood === 'happy' || mood === 'delight';
      mesh.position.x = Math.sin(time * (happy ? 9 : 2)) * (happy ? 0.03 : 0.01);
    },
  };
}

export const bunny: Character = {
  name: 'Lapin',
  skin: 'clay',
  colors: COLORS,
  frontMask: [0.62, 0.92],
  stripes: [0, 0, 0],
  body: {
    geometry: () => bodyGeometry(),
    surface: () => bodyGeometry(48, 36),
    bottom: BODY_BOTTOM,
    fur: 0.07,
  },
  face: {
    center: [0, 0.5],
    size: [0.46, 0.32],
    slide: { x: [-0.6, 0.6], y: [0.1, 1] },
    eyes: { x: 0.23, y: 0.58, size: 1.3 },
    brows: { y: 0.72, color: '#4d6c9e' },
    nose: { build: nose, y: 0.475, lift: 0.015 },
    mouth: { y: 0.39, scale: 0.95 },
    cheeks: { x: 0.36, y: 0.46 },
  },
  ears: {
    geometry: earGeometry,
    position: [0.27, 0.93, -0.12],
    tilt: 0.32,
    lift: 0,
    fur: 0.05,
    inner: true,
  },
  arms: { position: [0.8, 0.1, 0.24], scale: 0.75, pads: '#ffc2d4' },
  feet: { position: [0.32, 0.06, 0.44], scale: 0.95, mode: FurMode.front },
  bust: 0.1,
  extras: pompom,
};
