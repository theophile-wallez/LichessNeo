import {
  BackSide,
  Color,
  CapsuleGeometry,
  FrontSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Vector2,
  type Side,
} from 'three';
import type { Character } from './character.ts';
import { latheGeometry, type Profile } from './shapes.ts';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';
import { CUP, liquid, outside, TOP, type Recipe } from './soda-parts.ts';

// A soda: a clear plastic cup under a domed lid, a big straw through it, and
// the orange soda seen through the cup, fizzing and sloshing with its moods.

const cupGeometry = (columns = 96) => latheGeometry(CUP, columns);

// A rolled lip that overhangs the cup, then a tall bubble of a dome.
const LID: Profile = [
  [0.001, TOP - 0.03],
  [0.75, TOP - 0.03],
  [0.84, TOP],
  [0.85, TOP + 0.05],
  [0.8, TOP + 0.08],
  [0.73, TOP + 0.13],
  [0.62, TOP + 0.29],
  [0.42, TOP + 0.41],
  [0.001, TOP + 0.46],
];

// No transmission, which samples nothing over the transparent canvas: a faint
// see-through wall that turns opaque and pale where it's seen edge-on.
const RIM_FRAGMENT = /* glsl */ `
float edge = pow(1.0 - saturate(abs(dot(normalize(vViewPosition), normal))), 2.5);
float glint = smoothstep(0.75, 1.4, max(max(outgoingLight.r, outgoingLight.g), outgoingLight.b));
gl_FragColor = vec4(outgoingLight + edge * 0.3, saturate(diffuseColor.a + edge * 0.6 + glint * 0.35));`;

function glass(side: Side, opacity: number): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    color: '#f4f8ff',
    roughness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity,
    depthWrite: false,
    side,
  });
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      RIM_FRAGMENT,
    );
  };
  return material;
}

// The cup's far wall first, then the near one over the soda, then the blush on it.
const WALLS = [
  { material: glass(BackSide, 0.08), order: -2 },
  { material: glass(FrontSide, 0.06), order: -1 },
] as const;

const glint = new MeshBasicMaterial({
  color: '#ffffff',
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
});

function cup(rig: RigBuilder): void {
  const geometry = cupGeometry();
  for (const { material, order } of WALLS) {
    const wall = new Mesh(geometry, material);
    wall.renderOrder = order;
    rig.body.add(wall);
  }
  // The shine down its left, as a cartoon draws glass: a long streak, a short one.
  for (const [start, low, high] of [
    [-1.02, -0.72, 0.36],
    [-0.86, 0.06, 0.34],
  ] as const) {
    const path = [0, 1, 2, 3, 4].map(i => {
      const y = low + ((high - low) * i) / 4;
      return new Vector2(outside(y) + 0.012, y);
    });
    const streak = new Mesh(new LatheGeometry(path, 6, start, 0.09), glint);
    rig.body.add(streak);
  }
}

function straw(rig: RigBuilder): void {
  const pivot = new Group();
  pivot.position.set(0.08, TOP + 0.24, -0.04);
  pivot.rotation.set(-0.08, 0, -0.26);
  const tube = rig.fur(new CapsuleGeometry(0.09, 1.8, 8, 28), {
    layers: 8,
    length: 0.01,
    mode: FurMode.accent,
  });
  // Down near the bottom, its top a little past the lid.
  tube.position.y = -0.6;
  pivot.add(tube);
  rig.body.add(pivot);
}

// What the moods do to the soda: joy sloshes it and sets it fizzing, a shock bursts
// its fizz, sadness lowers it and lets it go flat, anger boils it, a thought stirs it.
const RECIPE: Recipe = {
  calm: { level: 0, slosh: 0.012, pace: 1.6, ripple: 0.005, swirl: 0, fizz: 0.45, boil: 0 },
  moods: {
    neutral: {},
    happy: { slosh: 0.06, pace: 3.4, ripple: 0.012, fizz: 0.8 },
    delight: { slosh: 0.12, pace: 4.8, ripple: 0.02, fizz: 1.2, swirl: 0.6 },
    doubt: { swirl: 0.3, slosh: 0.02, fizz: 0.35 },
    worry: { level: -0.04, slosh: 0.012, pace: 15, fizz: 0.25 },
    shock: { level: 0.06, slosh: 0.016, pace: 18, ripple: 0.02, fizz: 1.3 },
    surprise: { level: 0.04, slosh: 0.04, pace: 5, fizz: 1 },
    sad: { level: -0.12, slosh: 0, ripple: 0, fizz: 0.04 },
    angry: { slosh: 0.01, pace: 13, ripple: 0.012, fizz: 1.4, boil: 1 },
    proud: { level: 0.05, slosh: 0.03, pace: 2, fizz: 0.7 },
    thinking: { swirl: 0.8, ripple: 0.003, fizz: 0.35 },
    shy: { slosh: 0.025, pace: 2, fizz: 0.5 },
  },
  // Red when angry, washed out when sad, pink when shy.
  tints: {
    angry: new Color('#ff8a8a'),
    sad: new Color('#c9d0dc'),
    worry: new Color('#e8e9ee'),
    shy: new Color('#ffc4d6'),
  },
};

export const soda: Character = {
  name: 'Soda',
  skin: 'plastic',
  // The body is the lid, all in the front color; the arms take the coat's orange.
  colors: { coat: '#ffb35c', front: '#fffaf2', accent: '#ff86b3' },
  frontMask: [-2, -2],
  stripes: [0, 0, 0],
  body: {
    geometry: () => latheGeometry(LID),
    surface: () => cupGeometry(48),
    bottom: -1,
    fur: 0.04,
  },
  face: {
    center: [0, 0.06],
    size: [0.5, 0.36],
    slide: { x: [-0.6, 0.6], y: [-0.5, 0.45] },
    eyes: { x: 0.25, y: 0.13, size: 1.35 },
    brows: { y: 0.3, color: '#8a3d10' },
    nose: null,
    mouth: { y: -0.03, scale: 1.05 },
    cheeks: { x: 0.42, y: -0.01 },
  },
  ears: null,
  arms: { position: [0.76, -0.28, 0.06], scale: 0.55, pads: null },
  feet: null,
  bust: -0.24,
  extras: rig => {
    cup(rig);
    straw(rig);
    return liquid(rig, RECIPE);
  },
};
