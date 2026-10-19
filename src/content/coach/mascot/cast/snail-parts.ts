import {
  CapsuleGeometry,
  CatmullRomCurve3,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';
import type { PartMotion } from './character.ts';
import { swaying, together } from './parts.ts';
import { reshape } from './shapes.ts';

// What makes a snail a snail, on its upright head: a shell with a spiral on
// its face, a foot along the ground, two eye stalks that sway.

type Triple = readonly [number, number, number];

interface ShellLook {
  readonly position: Triple;
  /** Its turn about the vertical: 0 shows the spiral head-on. */
  readonly turn: number;
  readonly radius: number;
  /** How far it bulges toward its face. */
  readonly depth: number;
  readonly turns: number;
  readonly groove: string;
  readonly grooveWidth: number;
}

interface StalksLook {
  readonly y: number;
  /** How far apart, and how much they lean out. */
  readonly spread: number;
  readonly lean: number;
  readonly length: number;
  readonly knob: number;
}

interface FootLook {
  readonly position: Triple;
  readonly turn: number;
  readonly length: number;
}

export interface SnailParts {
  readonly shell: ShellLook;
  readonly stalks: StalksLook;
  readonly foot: FootLook | null;
}

const grooves = new Map<string, MeshStandardMaterial>();

function grooveMaterial(color: string): MeshStandardMaterial {
  const known = grooves.get(color);
  if (known) return known;
  const material = new MeshStandardMaterial({ color, roughness: 0.6 });
  grooves.set(color, material);
  return material;
}

/** An Archimedean spiral from the shell's middle out, laid on its face. */
function spiral({ radius, depth, turns }: ShellLook): CatmullRomCurve3 {
  const points = Array.from({ length: 160 }, (_, i) => {
    const along = i / 159;
    const angle = along * Math.PI * 2 * turns;
    const reach = 0.08 * radius + along * 0.8 * radius;
    const z = depth * Math.sqrt(Math.max(0, 1 - (reach / radius) ** 2));
    return new Vector3(Math.cos(angle) * reach, Math.sin(angle) * reach, z + 0.01);
  });
  return new CatmullRomCurve3(points);
}

function shell(rig: RigBuilder, look: ShellLook): PartMotion {
  const pivot = new Group();
  pivot.position.set(...look.position);
  pivot.rotation.y = look.turn;
  const geometry = reshape(new SphereGeometry(look.radius, 64, 40), vertex => {
    vertex.z *= look.depth / look.radius;
  });
  pivot.add(rig.fur(geometry, { layers: 14, length: 0.03, mode: FurMode.accent }));
  const groove = new TubeGeometry(spiral(look), 320, look.grooveWidth, 10);
  pivot.add(new Mesh(groove, grooveMaterial(look.groove)));
  rig.body.add(pivot);
  return swaying(pivot, { axis: 'z', amount: 0.03, speed: 1.6, offset: 0 });
}

function foot(rig: RigBuilder, look: FootLook): void {
  const geometry = reshape(new CapsuleGeometry(0.3, look.length, 12, 40), vertex => {
    vertex.z *= 0.75;
    vertex.x *= 0.55;
  });
  geometry.rotateZ(Math.PI / 2);
  const mesh = rig.fur(geometry, { layers: 12, length: 0.04, mode: FurMode.coat });
  mesh.position.set(...look.position);
  mesh.rotation.y = look.turn;
  rig.body.add(mesh);
}

function eyeStalks(rig: RigBuilder, look: StalksLook): PartMotion {
  const stalk = new CapsuleGeometry(0.05, look.length, 6, 16);
  const knob = new SphereGeometry(look.knob, 24, 14);
  const parts = ([-1, 1] as const).map(side => {
    const pivot = new Group();
    pivot.position.set(side * look.spread, look.y, -0.02);
    pivot.rotation.z = -side * look.lean;
    const options = { layers: 10, length: 0.025, mode: FurMode.coat };
    const stem = rig.fur(stalk, options);
    stem.position.y = look.length / 2 + 0.03;
    const tip = rig.fur(knob, options);
    tip.position.y = look.length + 0.05 + look.knob * 0.6;
    pivot.add(stem, tip);
    rig.body.add(pivot);
    return swaying(pivot, { axis: 'z', amount: 0.14, speed: 2.4, offset: side });
  });
  return together(...parts);
}

export function snailExtras(parts: SnailParts): (rig: RigBuilder) => PartMotion {
  return rig => {
    if (parts.foot) foot(rig, parts.foot);
    return together(shell(rig, parts.shell), eyeStalks(rig, parts.stalks));
  };
}
