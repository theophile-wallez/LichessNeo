import { MathUtils, Mesh, MeshBasicMaterial, SphereGeometry, type BufferGeometry } from 'three';
import type { CoachMood } from '#shared/coach.ts';
import type { PartMotion } from './character.ts';
import { meltedMin, reshape } from './shapes.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';

// A star's shape, and the twinkles that sparkle around it when it's pleased.

export interface StarShape {
  readonly points: number;
  /** How far its rounded tips reach, and its hollows between them, from its middle. */
  readonly outer: number;
  readonly inner: number;
  /** The tips' radius. */
  readonly round: number;
  /** How wide the hollows are rounded. */
  readonly melt: number;
  /** How thick it is at its middle, front to back. */
  readonly depth: number;
}

/** How far (x, y) is outside the star's outline, negative inside. */
function outlineDistance(x: number, y: number, shape: StarShape): number {
  const sector = (2 * Math.PI) / shape.points;
  // Folded into half a point's wedge, its tip along the x axis.
  const angle = (((Math.atan2(x, y) % sector) + sector) % sector) - sector / 2;
  const folded = sector / 2 - Math.abs(angle);
  const length = Math.hypot(x, y);
  const [qx, qy] = [length * Math.cos(folded), length * Math.sin(folded)];
  const tip = shape.outer - shape.round;
  const [vx, vy] = [shape.inner * Math.cos(sector / 2) - tip, shape.inner * Math.sin(sector / 2)];
  const along = MathUtils.clamp(((qx - tip) * vx + qy * vy) / (vx * vx + vy * vy), 0, 1);
  const edge = Math.hypot(qx - tip - along * vx, qy - along * vy);
  const inside = vx * qy - vy * (qx - tip) > 0;
  const sharp = (inside ? -edge : edge) - shape.round;
  // A disk as wide as the hollows, melted in, rounds them off.
  return meltedMin(sharp, length - shape.inner - shape.round, shape.melt);
}

/** How far out the outline is at `angle` from straight up, by bisection. */
function reachAt(angle: number, shape: StarShape): number {
  let [inside, outside] = [0, shape.outer * 1.5];
  for (let i = 0; i < 24; i++) {
    const middle = (inside + outside) / 2;
    const distance = outlineDistance(Math.sin(angle) * middle, Math.cos(angle) * middle, shape);
    if (distance < 0) inside = middle;
    else outside = middle;
  }
  return inside;
}

/** A plump star, one point straight up, puffed out at its middle like a cushion. */
export function starGeometry(shape: StarShape, rows = 72): BufferGeometry {
  return reshape(new SphereGeometry(1, Math.round(rows * 1.4), rows), vertex => {
    const reach = reachAt(Math.atan2(vertex.x, vertex.y), shape);
    const point = MathUtils.clamp((reach - shape.inner) / (shape.outer - shape.inner), 0, 1);
    const across = Math.hypot(vertex.x, vertex.y);
    vertex.x *= reach;
    vertex.y *= reach;
    // Thinner toward the tips than at the middle, as a stuffed cushion is.
    vertex.z *= shape.depth * (1 - 0.3 * across * point);
  });
}

/** A four-pointed twinkle, flat, facing ahead. */
function twinkleGeometry(): BufferGeometry {
  return reshape(new SphereGeometry(0.15, 32, 12), vertex => {
    const angle = Math.atan2(vertex.x, vertex.y);
    const reach = 0.3 + 0.7 * ((1 + Math.cos(4 * angle)) / 2) ** 3;
    vertex.x *= reach;
    vertex.y *= reach;
    vertex.z *= 0.2;
  });
}

const twinkleMaterial = new MeshBasicMaterial({ color: '#fff6c2', toneMapped: false });

const sparkly = (mood: CoachMood): number => {
  if (mood === 'delight') return 1;
  return mood === 'happy' || mood === 'proud' ? 0.75 : 0;
};

// By x, y, z, size and phase, around its points.
const TWINKLES: readonly (readonly [number, number, number, number, number])[] = [
  [-1.12, 0.72, 0.15, 1, 0],
  [1.18, 0.42, 0.15, 0.8, 1.9],
  [0.78, 1.08, 0, 0.65, 3.4],
  [-0.96, -0.42, 0.2, 0.7, 4.6],
  [1.02, -0.5, 0.2, 0.55, 2.7],
  [-0.62, 1.12, 0, 0.5, 5.5],
];

export function twinkles(rig: RigBuilder): PartMotion {
  const geometry = twinkleGeometry();
  const sparkles = TWINKLES.map(([x, y, z, size, phase]) => {
    const mesh = new Mesh(geometry, twinkleMaterial);
    mesh.position.set(x, y, z);
    mesh.visible = false;
    rig.body.add(mesh);
    return { mesh, size, phase };
  });
  let amount = 0;
  let last = 0;
  return {
    update: (time, mood) => {
      amount = MathUtils.damp(amount, sparkly(mood), 6, time - last);
      last = time;
      for (const { mesh, size, phase } of sparkles) {
        const flash = (0.5 + 0.5 * Math.sin(time * 4.2 + phase)) ** 2;
        mesh.scale.setScalar(amount * size * (0.35 + 0.65 * flash));
        mesh.rotation.z = Math.sin(time * 1.3 + phase) * 0.4;
        mesh.visible = amount > 0.02;
      }
    },
  };
}
