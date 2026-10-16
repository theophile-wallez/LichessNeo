import { Color, MathUtils, Mesh, MeshPhysicalMaterial, SphereGeometry, Vector3 } from 'three';
import type { CoachMood } from '#shared/coach.ts';
import type { PartMotion } from './character.ts';
import { damp, Spring } from '#content/coach/mascot/motion.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';
import { SLIME_BOTTOM, slimeGeometry, slimeRadius } from './slime-shape.ts';

// What makes the slime jelly: a see-through skin over its darker heart, bubbles
// rising in it, a wobble that rings on after every bump, and moods that work on
// the jelly itself: it slumps into a puddle when sad, bounces when happy, boils
// red when angry, blushes pink, and a ripple runs down it when it starts.

const { clamp, smoothstep } = MathUtils;

/** What a mood does to the jelly; each eases in. */
interface Mix {
  /** How far it slumps into a puddle, from 0. */
  slump: number;
  /** How often it bounces of itself, a second. */
  bounce: number;
  /** How much its skin churns. */
  boil: number;
  /** How many bubbles rise, and how fast. */
  fizz: number;
  pace: number;
}

const CALM: Mix = { slump: 0, bounce: 0, boil: 0, fizz: 0.35, pace: 0.1 };
const MIXES: Partial<Record<CoachMood, Partial<Mix>>> = {
  sad: { slump: 1, fizz: 0.15, pace: 0.05 },
  worry: { slump: 0.35 },
  happy: { bounce: 1.3 },
  delight: { bounce: 2, fizz: 0.6, pace: 0.2 },
  angry: { boil: 1, fizz: 1, pace: 0.55 },
  thinking: { fizz: 1, pace: 0.07 },
};
/** Moods that send a ripple down it as they come. */
const STARTS: ReadonlySet<CoachMood> = new Set(['surprise', 'shock']);

const JELLY = new Color('#a8ffe4');
const TINTS: Partial<Record<CoachMood, Color>> = {
  angry: new Color('#ff8f80'),
  shy: new Color('#ffb3cf'),
};

/** The jelly's state, shared by its parts each frame. */
interface Jelly {
  time: number;
  dt: number;
  mood: CoachMood;
  mix: Mix;
  /** When the last ripple started. */
  rippled: number;
}

// Its skin's edge seen side on goes darker and thicker, as light crosses more jelly there.
const RIM_GLSL = /* glsl */ `#include <dithering_fragment>
float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.0);
gl_FragColor.rgb *= 1.0 - 0.4 * rim;
gl_FragColor.a = mix(gl_FragColor.a, 0.92, rim);`;

function jellyMaterial(): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    color: JELLY,
    roughness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    emissive: '#2fae8a',
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      RIM_GLSL,
    );
  };
  return material;
}

/** Its see-through skin, which ripples and churns about its rest. */
function skin(rig: RigBuilder): (jelly: Jelly) => void {
  const geometry = slimeGeometry(72);
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const rest = Float32Array.from(position.array);
  const out = Float32Array.from(normal.array);
  const material = jellyMaterial();
  const mesh = new Mesh(geometry, material);
  // After its heart, which shows through it.
  mesh.renderOrder = 1;
  rig.body.add(mesh);
  let moving = false;
  return ({ time, dt, mood, mix, rippled }) => {
    material.color.lerp(TINTS[mood] ?? JELLY, 1 - Math.exp(-4 * dt));
    const since = time - rippled;
    // None before its first ripple, when `since` is endless.
    const ripple = since < 3 ? 0.035 * Math.exp(-since * 2.2) * smoothstep(since, 0, 0.05) : 0;
    if (ripple < 0.001 && mix.boil < 0.01 && !moving) return;
    moving = ripple >= 0.001 || mix.boil >= 0.01;
    for (let i = 0; i < position.count; i++) {
      const [x, y, z] = [rest[i * 3] ?? 0, rest[i * 3 + 1] ?? 0, rest[i * 3 + 2] ?? 0];
      // Its base stays on the ground.
      const free = smoothstep(y, SLIME_BOTTOM, SLIME_BOTTOM + 0.15);
      const wave = ripple > 0 ? ripple * Math.sin(12 * y + 14 * since) : 0;
      const churn =
        mix.boil *
        0.02 *
        Math.sin(x * 11 + time * 5) *
        Math.sin(z * 9 - time * 4) *
        Math.sin(y * 10 + time * 6);
      const push = (wave + churn) * free;
      position.setXYZ(
        i,
        x + (out[i * 3] ?? 0) * push,
        y + (out[i * 3 + 1] ?? 0) * push,
        z + (out[i * 3 + 2] ?? 0) * push,
      );
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  };
}

const BUBBLES = Array.from({ length: 16 }, (_, i) => ({
  // Round its front, where they show, and how deep in from the skin.
  angle: Math.sin(i * 2.3) * 1.1,
  depth: 0.05 + ((i * 3) % 4) * 0.02,
  pace: 0.7 + ((i * 7) % 5) / 6,
  size: 0.5 + ((i * 5) % 4) / 5,
  start: (i * 0.37) % 1,
}));
const BUBBLE_RADIUS = 0.035;
// The heights they rise between, in its jelly above its base.
const RISE = { from: -0.85, to: 0.55 } as const;

/** Bubbles rising slowly through the jelly, more and faster as it boils or thinks. */
function bubbles(rig: RigBuilder): (jelly: Jelly) => void {
  const geometry = new SphereGeometry(BUBBLE_RADIUS, 14, 10);
  const material = new MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0.05,
    clearcoat: 1,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const meshes = BUBBLES.map(() => {
    const mesh = new Mesh(geometry, material);
    rig.body.add(mesh);
    return mesh;
  });
  const rises = BUBBLES.map(bubble => bubble.start);
  return ({ dt, mix }) => {
    for (const [i, bubble] of BUBBLES.entries()) {
      const mesh = meshes[i];
      if (!mesh) continue;
      const rise = ((rises[i] ?? 0) + dt * bubble.pace * mix.pace) % 1;
      rises[i] = rise;
      const shown = clamp(mix.fizz * 1.6 - (i % 5) * 0.3, 0, 1);
      const fade = smoothstep(rise, 0, 0.12) * (1 - smoothstep(rise, 0.85, 1));
      const size = shown * fade * bubble.size * (1 + mix.boil * 0.6);
      mesh.visible = size > 0.02;
      const y = RISE.from + (RISE.to - RISE.from) * rise;
      const reach = Math.max(slimeRadius(y) - bubble.depth, 0);
      const angle = bubble.angle + Math.sin(rise * 7 + i) * 0.08;
      mesh.position.set(Math.sin(angle) * reach, y, Math.cos(angle) * reach * 0.92);
      mesh.scale.setScalar(size);
    }
  };
}

/** Its whole wobble: squashed one way then the other after each bump, slumped by its mood. */
function wobble(rig: RigBuilder): (jelly: Jelly) => void {
  const spring = new Spring(150, 3.2);
  const [place, last] = [new Vector3(), new Vector3()];
  let speed = 0;
  let slump = 0;
  let nextBounce = 0;
  let shown: CoachMood = 'neutral';
  return ({ time, dt, mood, mix }) => {
    rig.body.getWorldPosition(place);
    const rising = dt > 0 ? (place.y - last.y) / dt : 0;
    last.copy(place);
    // A sudden change of pace up or down, a landing or a hop, sets it going.
    spring.kick(clamp((rising - speed) * 0.6, -3, 3));
    speed = rising;
    if (mood !== shown) {
      shown = mood;
      spring.kick(-1.2);
    }
    if (mix.bounce > 0.05 && time >= nextBounce) {
      spring.kick(-1.4);
      nextBounce = time + 1 / mix.bounce;
    }
    const squash = spring.step(dt);
    slump = damp(slump, mix.slump, 3, dt);
    const tall = (1 + squash * 0.12) * (1 - 0.22 * slump);
    const wide = (1 - squash * 0.06) * (1 + 0.14 * slump);
    rig.body.scale.set(wide, tall, wide);
    // Squashed about its base, which stays on the ground.
    rig.body.position.y = -SLIME_BOTTOM * tall;
  };
}

export function slimeExtras(rig: RigBuilder): PartMotion {
  const parts = [wobble(rig), skin(rig), bubbles(rig)];
  const jelly: Jelly = { time: 0, dt: 0, mood: 'neutral', mix: { ...CALM }, rippled: -Infinity };
  const keys = Object.keys(CALM).filter((key): key is keyof Mix => key in CALM);
  return {
    update: (time, mood) => {
      jelly.dt = clamp(time - jelly.time, 0, 0.1);
      jelly.time = time;
      if (mood !== jelly.mood && STARTS.has(mood)) jelly.rippled = time;
      jelly.mood = mood;
      const target = { ...CALM, ...MIXES[mood] };
      for (const key of keys) jelly.mix[key] = damp(jelly.mix[key], target[key], 3, jelly.dt);
      for (const part of parts) part(jelly);
    },
  };
}
