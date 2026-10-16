import {
  Color,
  Float32BufferAttribute,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MultiplyBlending,
  SphereGeometry,
  type BufferGeometry,
} from 'three';
import { easing } from '#content/coach/mascot/motion.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';
import type { PartMotion } from './character.ts';
import { together } from './parts.ts';
import { reshape, softBox } from './shapes.ts';

// A slice of bread, and what it does as one: a crust that burns and smokes when
// it's angry, and a breath of steam as it thinks.

const { smoothstep } = MathUtils;

/** A flat square with a domed top that overhangs its sides, its middle at the origin. */
export function sliceGeometry(rows = 64): BufferGeometry {
  return reshape(softBox([0.8, 0.95, 0.36], 3.2, 0, rows), vertex => {
    const top = smoothstep(vertex.y, 0.35, 0.95);
    vertex.x *= 1 + 0.24 * top;
    // The dip between the dome's two lobes.
    vertex.y += 0.14 * top - 0.1 * top * Math.exp(-(vertex.x ** 2) / 0.04);
  });
}

// What toasting does to its colors, multiplied: the crumb browns, the crust goes dark.
const TOASTED_CRUMB = new Color(0.86, 0.68, 0.52);
const TOASTED_CRUST = new Color(0.4, 0.27, 0.18);

/** How toasted each point of the slice gets: its crust most, in patches. */
function toastedColors(geometry: BufferGeometry): Float32Array {
  const normals = geometry.getAttribute('normal');
  const positions = geometry.getAttribute('position');
  const colors = new Float32Array(normals.count * 3);
  const color = new Color();
  for (let i = 0; i < normals.count; i++) {
    const crust = 1 - Math.abs(normals.getZ(i)) ** 2;
    const [x, y] = [positions.getX(i), positions.getY(i)];
    const patch = 0.5 + 0.5 * Math.sin(x * 6.3 + 1) * Math.sin(y * 4.7 + 2);
    color.copy(TOASTED_CRUMB).lerp(TOASTED_CRUST, Math.min(1, crust + 0.35 * patch));
    color.toArray(colors, i * 3);
  }
  return colors;
}

/** Its skin toasting while it's angry, then golden again: its colors multiplied darker. */
function burn(rig: RigBuilder): PartMotion {
  const geometry = sliceGeometry();
  const toasted = toastedColors(geometry);
  const colors = new Float32BufferAttribute(new Float32Array(toasted.length).fill(1), 3);
  geometry.setAttribute('color', colors);
  const material = new MeshBasicMaterial({
    vertexColors: true,
    blending: MultiplyBlending,
    premultipliedAlpha: true,
    transparent: true,
    depthWrite: false,
    // Right on the skin, drawn over it.
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -4,
  });
  const toast = new Mesh(geometry, material);
  toast.visible = false;
  rig.body.add(toast);
  const burning = easing(1.2);
  let shown = 0;
  return {
    update: (time, mood) => {
      const burnt = burning(time, mood === 'angry' ? 1 : 0);
      toast.visible = burnt > 0.01;
      if (Math.abs(burnt - shown) < 0.002) return;
      shown = burnt;
      for (let i = 0; i < toasted.length; i++)
        colors.array[i] = 1 + ((toasted[i] ?? 1) - 1) * burnt;
      colors.needsUpdate = true;
    },
  };
}

const PUFFS = 10;
const SMOKE = new Color('#4e4540');
const STEAM = new Color('#ffffff');

/** Smoke rising off its top while it burns, or a thin steam while it thinks. */
function vapor(rig: RigBuilder): PartMotion {
  const ball = new SphereGeometry(1, 16, 12);
  const puffs = Array.from({ length: PUFFS }, (_, i) => {
    const material = new MeshStandardMaterial({
      roughness: 1,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const puff = new Mesh(ball, material);
    puff.visible = false;
    rig.body.add(puff);
    // Spread over the top, out of step with when each rises.
    return { puff, material, offset: i / PUFFS, x: Math.sin(i * 2.4) * 0.45 };
  });
  const smoking = easing(2);
  const steaming = easing(2);
  const color = new Color();
  return {
    update: (time, mood) => {
      const smoke = smoking(time, mood === 'angry' ? 1 : 0);
      const steam = steaming(time, mood === 'thinking' ? 1 : 0);
      const strength = Math.max(smoke, steam * 0.45);
      color.copy(STEAM).lerp(SMOKE, smoke / Math.max(smoke + steam, 1e-3));
      for (const { puff, material, offset, x } of puffs) {
        const along = (time * 0.4 + offset) % 1;
        puff.visible = strength > 0.02;
        if (!puff.visible) continue;
        material.color.copy(color);
        material.opacity = strength * smoothstep(along, 0, 0.2) * (1 - along) * 0.6;
        const drift = Math.sin(time * 1.3 + offset * 6) * 0.12 * along;
        puff.position.set(x * (1 - 0.4 * along) + drift, 1 + along * 0.75, -0.05 - along * 0.1);
        puff.scale.set(0.1 + 0.12 * along, 0.08 + 0.08 * along, 0.1 + 0.12 * along);
      }
    },
  };
}

export function toastExtras(rig: RigBuilder): PartMotion {
  return together(burn(rig), vapor(rig));
}
