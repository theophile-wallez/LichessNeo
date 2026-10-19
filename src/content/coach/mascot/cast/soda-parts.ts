import {
  BufferAttribute,
  Color,
  LatheGeometry,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  Quaternion,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { CoachMood } from '#shared/coach.ts';
import type { PartMotion } from './character.ts';
import { profileRadius, type Profile } from './shapes.ts';
import { damp, Spring } from '#content/coach/mascot/motion.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';

// The soda's cup, and the soda seen through it: it stays level as the cup
// leans and sloshes as it moves, and its fizz rises faster, slower or not at
// all with the moods.

const { clamp, lerp, smoothstep } = MathUtils;

export const TOP = 0.55;

/** The cup's outside, a chubby tumbler a little wider at its rim. */
export const CUP: Profile = [
  [0.001, -1],
  [0.5, -1],
  [0.64, -0.96],
  [0.7, -0.86],
  [0.74, -0.4],
  [0.78, 0.1],
  [0.8, TOP - 0.08],
  [0.79, TOP],
  [0.001, TOP],
];

// The cup's wall, the soda inside it.
const WALL = 0.06;
const SIDE = CUP.slice(1, -1);

/** How far the inside of the wall is from the middle at height `y`. */
const inside = (y: number): number => profileRadius(SIDE, y) - WALL;

/** How far the outside of the wall is from the middle at height `y`. */
export const outside = (y: number): number => inside(y) + WALL;

const BOTTOM = -0.9;
const LEVEL = 0.42;

/** What a mood does to the soda; each eases in. */
interface Brew {
  /** The soda's height, off its rest. */
  readonly level: number;
  /** How far it sloshes from side to side, and how fast. */
  readonly slosh: number;
  readonly pace: number;
  readonly ripple: number;
  /** How deep the dip a stirred soda makes in its middle, and how fast its fizz goes round. */
  readonly swirl: number;
  /** How much it fizzes, from flat at 0. */
  readonly fizz: number;
  /** Its surface churning and its bubbles swelling, as it boils. */
  readonly boil: number;
}

/** The soda's brew at rest and in each mood, and a mood's tint over it. */
export interface Recipe {
  readonly calm: Brew;
  readonly moods: Readonly<Record<CoachMood, Partial<Brew>>>;
  readonly tints: Partial<Readonly<Record<CoachMood, Color>>>;
}

// Deeper at the bottom, brighter up top.
const DEEP = new Color('#ff5e00');
const BRIGHT = new Color('#ffa21f');
const PLAIN = new Color('#ffffff');

const sodaMaterial = new MeshPhysicalMaterial({
  vertexColors: true,
  roughness: 0.2,
  clearcoat: 0.6,
});
const bubbleMaterial = new MeshPhysicalMaterial({
  color: '#fff8e6',
  roughness: 0.1,
  clearcoat: 1,
  transparent: true,
  opacity: 0.8,
});

/** The soda's state, eased toward the mood's brew each frame. */
interface Soda {
  brew: { -readonly [key in keyof Brew]: number };
  /** Its height at (x, z), in the cup. */
  surface: (x: number, z: number) => number;
  time: number;
  dt: number;
  /** How far round the swirl has carried its fizz. */
  turn: number;
  /** The tint it eases to. */
  tint: Color;
}

const RING = [1, 1, 0.8, 0.6, 0.4, 0.2, 0.001];

function sodaGeometry(): LatheGeometry {
  const wall = Array.from({ length: 16 }, (_, i) => {
    const y = lerp(BOTTOM + 0.04, LEVEL, i / 15);
    return new Vector2(inside(y), y);
  });
  // The rim's point twice, so the sides keep their crease with the top.
  const top = RING.map(share => new Vector2(inside(LEVEL) * share, LEVEL));
  const profile = [new Vector2(0.001, BOTTOM), new Vector2(inside(BOTTOM) - 0.05, BOTTOM)];
  // Its seam at the back.
  return new LatheGeometry([...profile, ...wall, ...top], 48, Math.PI);
}

/** The soda, its surface moved by `soda.surface` every frame, each point between it and the bottom. */
function sodaMesh(rig: RigBuilder): (soda: Soda) => void {
  const geometry = sodaGeometry();
  const position = geometry.getAttribute('position');
  const base = Float32Array.from(position.array);
  const depth = base.filter((_, i) => i % 3 === 1).map(y => smoothstep(y, BOTTOM, LEVEL));
  const colors = new BufferAttribute(new Float32Array(position.count * 3), 3);
  geometry.setAttribute('color', colors);
  const mesh = new Mesh(geometry, sodaMaterial);
  rig.body.add(mesh);
  const tint = PLAIN.clone();
  const shade = new Color();
  const paint = (): void => {
    for (const [i, amount] of depth.entries()) {
      shade.lerpColors(DEEP, BRIGHT, amount).multiply(tint);
      colors.setXYZ(i, shade.r, shade.g, shade.b);
    }
    colors.needsUpdate = true;
  };
  paint();
  return soda => {
    for (let i = 0; i < position.count; i++) {
      const [x, y, z] = [base[i * 3] ?? 0, base[i * 3 + 1] ?? 0, base[i * 3 + 2] ?? 0];
      const share = (y - BOTTOM) / (LEVEL - BOTTOM);
      const height = BOTTOM + share * (soda.surface(x, z) - BOTTOM);
      const widen = inside(height) / inside(y);
      position.setXYZ(i, x * widen, height, z * widen);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    const target = soda.tint;
    if (tint.equals(target)) return;
    tint.lerp(target, 1 - Math.exp(-4 * soda.dt));
    if (Math.abs(tint.r - target.r) + Math.abs(tint.g - target.g) < 0.004) tint.copy(target);
    paint();
  };
}

const BUBBLE_RADIUS = 0.042;
/** How thick a bubble is against the wall, for its width. */
const FLAT = 0.3;
const AHEAD = new Vector3(0, 0, 1);

/** Fizz rising up the cup's wall, where it shows through: by angle, pace, size and where
 * in their rise they start. */
const BUBBLES = Array.from({ length: 26 }, (_, i) => ({
  angle: (i / 26) * Math.PI * 2 + (i % 3) * 0.3,
  pace: 0.5 + ((i * 7) % 5) / 8,
  size: 0.6 + ((i * 5) % 4) / 6,
  start: (i * 0.37) % 1,
}));

// Flat against the wall, they show through it in front and vanish edge-on at its sides,
// never standing out of the soda into the glass.
function bubbles(rig: RigBuilder): (soda: Soda) => void {
  const geometry = new SphereGeometry(BUBBLE_RADIUS, 16, 12);
  const meshes = BUBBLES.map(() => {
    const mesh = new Mesh(geometry, bubbleMaterial);
    rig.body.add(mesh);
    return mesh;
  });
  const rises = BUBBLES.map(bubble => bubble.start);
  const outward = new Vector3();
  return soda => {
    const { fizz, boil } = soda.brew;
    for (const [i, bubble] of BUBBLES.entries()) {
      const mesh = meshes[i];
      const rise = ((rises[i] ?? 0) + soda.dt * bubble.pace * (0.2 + fizz * 0.8)) % 1;
      rises[i] = rise;
      if (!mesh) continue;
      // Fewer of them as it goes flat; bigger as it boils, and swelling on their way up.
      const shown = clamp(fizz * 1.4 - (i % 4) * 0.25, 0, 1);
      const swell = 0.6 + 0.6 * rise + boil * 0.8;
      const fade = smoothstep(rise, 0, 0.1) * (1 - smoothstep(rise, 0.9, 1));
      const size = shown * fade * swell * bubble.size;
      const angle = bubble.angle + soda.turn + Math.sin(rise * 9 + i) * 0.04;
      outward.set(Math.sin(angle), 0, Math.cos(angle));
      // Up to the surface where it is, tilted or sloshing, its top under it.
      const edge = inside(LEVEL);
      const top = soda.surface(outward.x * edge, outward.z * edge) - BUBBLE_RADIUS * size;
      const y = lerp(BOTTOM + 0.06, top, rise);
      mesh.visible = size > 0.02;
      mesh.scale.set(size, size, size * FLAT);
      mesh.quaternion.setFromUnitVectors(AHEAD, outward);
      const reach = inside(y) - 0.002;
      mesh.position.set(outward.x * reach, y, outward.z * reach);
    }
  };
}

// Pulls toward the ground, in the body's units a second squared: sets how far a jolt sloshes.
const GRAVITY = 14;
/** Moods that jolt the soda as they come, sloshing it and setting it fizzing. */
const JOLTS: ReadonlySet<CoachMood> = new Set(['shock', 'surprise', 'delight']);

/** Which way is up for the soda, in the cup: the ground's pull, and the cup's own speeding up. */
function pull(rig: RigBuilder): (dt: number) => Vector3 {
  const [place, last, speed, up] = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  const turned = new Quaternion();
  return dt => {
    rig.body.getWorldPosition(place);
    up.set(0, GRAVITY, 0);
    if (dt > 0) {
      const moving = place.clone().sub(last).divideScalar(dt);
      const speeding = moving.clone().sub(speed).divideScalar(dt);
      up.add(speeding.clampLength(0, GRAVITY * 0.6));
      speed.copy(moving);
    }
    last.copy(place);
    return up.applyQuaternion(rig.body.getWorldQuaternion(turned).invert());
  };
}

/** The soda and its fizz, level as the world is, sloshing as the cup moves, stirred by moods. */
export function liquid(rig: RigBuilder, recipe: Recipe): PartMotion {
  const keys = Object.keys(recipe.calm).filter((key): key is keyof Brew => key in recipe.calm);
  const state: Soda = {
    brew: { ...recipe.calm },
    surface: () => LEVEL,
    time: 0,
    dt: 0,
    turn: 0,
    tint: PLAIN,
  };
  const parts = [sodaMesh(rig), bubbles(rig)];
  const tilt = { x: new Spring(60, 3.2), z: new Spring(60, 3.2) };
  const upward = pull(rig);
  let phase = 0;
  let shown: CoachMood = 'neutral';
  return {
    update: (time, mood) => {
      const dt = clamp(time - state.time, 0, 0.1);
      const target = { ...recipe.calm, ...recipe.moods[mood] };
      Object.assign(state, { time, dt, tint: recipe.tints[mood] ?? PLAIN });
      for (const key of keys) state.brew[key] = damp(state.brew[key], target[key], 3, dt);
      if (mood !== shown && JOLTS.has(mood)) {
        tilt.x.kick(1.6);
        state.brew.fizz += 1;
      }
      shown = mood;
      const { brew } = state;
      phase += dt * brew.pace;
      const up = upward(dt);
      tilt.x.target = -up.x / up.y + Math.sin(phase) * brew.slosh;
      tilt.z.target = -up.z / up.y + Math.cos(phase * 0.7) * brew.slosh * 0.5;
      const [slopeX, slopeZ] = [tilt.x.step(dt), tilt.z.step(dt)];
      const level = LEVEL + brew.level;
      state.turn += dt * brew.swirl;
      state.surface = (x, z) => {
        const out = Math.hypot(x, z) / inside(LEVEL);
        const wave = Math.sin(out * 9 - time * 5) * brew.ripple * out;
        const boil = Math.sin(x * 21 + time * 11) * Math.sin(z * 17 - time * 9) * brew.boil * 0.02;
        // Stirred, it dips in the middle and climbs the wall.
        const whirl = brew.swirl * 0.07 * (out * out - 0.5);
        return level + slopeX * x + slopeZ * z + wave + boil + whirl;
      };
      for (const part of parts) part(state);
    },
  };
}
