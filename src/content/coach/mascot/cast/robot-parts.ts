import {
  CapsuleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Material,
} from 'three';
import { FurMode } from '#content/coach/mascot/fur/fur.ts';
import type { RigBuilder } from '#content/coach/mascot/rig/limbs.ts';
import type { PartMotion } from './character.ts';
import { lively, swaying, together } from './parts.ts';

// What makes the robot a robot: a neck of rings, two antennae with glowing
// tips, earphones, and a panel of lights on its chest that blink as it thinks.

const SIDES = [-1, 1] as const;

/** A light: unlit, and kept at full strength by the tone mapping. */
const glowMaterial = (color: string): MeshBasicMaterial =>
  new MeshBasicMaterial({ color, toneMapped: false });

const LIGHTS = ['#ff5555', '#f1fa8c', '#50fa7b'].map(glowMaterial);
const unlit = new MeshPhysicalMaterial({ color: '#2b3142', roughness: 0.3, clearcoat: 1 });

const plastic = (rig: RigBuilder, geometry: BufferGeometry): Mesh =>
  rig.fur(geometry, { layers: 1, length: 0, mode: FurMode.accent });

/** Two antennae leaning out from the head's top, their tips breathing light. */
function antennae(rig: RigBuilder, x: number, top: number): PartMotion {
  const { glow, halo } = rig.lights();
  const parts = SIDES.map(side => {
    const pivot = new Group();
    pivot.position.set(side * x, top - 0.03, 0);
    pivot.rotation.z = -side * 0.25;
    const stalk = plastic(rig, new CapsuleGeometry(0.026, 0.22, 4, 12));
    stalk.position.y = 0.13;
    const tip = new Mesh(new SphereGeometry(0.065, 24, 16), glow);
    tip.position.y = 0.3;
    const aura = new Mesh(new SphereGeometry(0.1, 24, 16), halo);
    tip.add(aura);
    pivot.add(stalk, tip);
    rig.body.add(pivot);
    const sway = swaying(pivot, { axis: 'z', amount: 0.1, speed: 2.8, offset: side });
    return {
      update: (time, mood) => {
        sway.update(time, mood);
        aura.scale.setScalar(1 + 0.3 * (0.5 + 0.5 * Math.sin(time * 3.2 * lively(mood) + side)));
      },
    } satisfies PartMotion;
  });
  return together(...parts);
}

/** Round earphones on the sides of its head, a ring of light on each. */
function earphones(rig: RigBuilder, x: number, y: number): void {
  const { glow } = rig.lights();
  const cup = new CylinderGeometry(0.2, 0.2, 0.12, 40);
  cup.rotateZ(Math.PI / 2);
  const ring = new TorusGeometry(0.11, 0.016, 10, 40);
  ring.rotateY(Math.PI / 2);
  for (const side of SIDES) {
    const phone = plastic(rig, cup);
    phone.position.set(side * x, y, 0);
    const light = new Mesh(ring, glow);
    light.position.x = side * 0.062;
    phone.add(light);
    rig.body.add(phone);
  }
}

/** A neck of two rings, between the head and the chest. */
function neck(rig: RigBuilder, y: number): void {
  for (const [i, radius] of [0.2, 0.17].entries()) {
    const ring = plastic(rig, new CylinderGeometry(radius, radius, 0.09, 32));
    ring.position.y = y + i * 0.1;
    rig.body.add(ring);
  }
}

/** A panel of three lights on its chest, blinking in turn, faster when it's pleased. */
function panel(rig: RigBuilder, geometry: BufferGeometry, y: number, z: number): PartMotion {
  const plate = plastic(rig, geometry);
  plate.position.set(0, y, z);
  rig.body.add(plate);
  const lights = LIGHTS.map((_, i) => {
    const light = new Mesh<SphereGeometry, Material>(new SphereGeometry(0.026, 16, 12), unlit);
    light.scale.z = 0.5;
    light.position.set((i - 1) * 0.1, 0, 0.05);
    plate.add(light);
    return light;
  });
  return {
    update: (time, mood) => {
      for (const [i, light] of lights.entries()) {
        const on = Math.sin(time * 2.4 * lively(mood) + i * 2.1) > 0.15;
        light.material = on ? (LIGHTS[i] ?? unlit) : unlit;
      }
    },
  };
}

export interface RobotParts {
  readonly head: { readonly y: number; readonly top: number; readonly side: number };
  readonly neck: number;
  readonly panel: { readonly geometry: BufferGeometry; readonly y: number; readonly z: number };
}

export function robotParts(rig: RigBuilder, parts: RobotParts): PartMotion {
  const { head, panel: plate } = parts;
  earphones(rig, head.side, head.y);
  neck(rig, parts.neck);
  return together(antennae(rig, 0.38, head.top), panel(rig, plate.geometry, plate.y, plate.z));
}
