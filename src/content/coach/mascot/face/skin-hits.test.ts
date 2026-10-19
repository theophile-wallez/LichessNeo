import { describe, expect, it } from 'vitest';
import {
  type BufferGeometry,
  DoubleSide,
  Group,
  type Intersection,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Points,
  Raycaster,
  SphereGeometry,
  Vector3,
} from 'three';
import { ROBOT_COACH_LEVEL } from '#shared/coach.ts';
import { CAST } from '#content/coach/mascot/cast/cast.ts';
import type { Character } from '#content/coach/mascot/cast/character.ts';
import { robotFor } from '#content/coach/mascot/cast/robot.ts';
import { type RayGrid, skinHits } from './skin-hits.ts';

const STEP = 0.05;

/** The skin turned and placed as the face samples it (surface.ts). */
function placed(skin: BufferGeometry | Object3D, turn = 0): Group {
  const target = new Group().add(skin instanceof Object3D ? skin : new Mesh(skin));
  target.rotation.y = -turn;
  target.updateMatrixWorld(true);
  return target;
}

const steps = (range: readonly [number, number]): number[] =>
  Array.from(
    { length: Math.round((range[1] - range[0]) / STEP) + 1 },
    (_, i) => range[0] + i * STEP,
  );

const gridOver = (x: readonly [number, number], y: readonly [number, number]): RayGrid => ({
  xs: steps(x),
  ys: steps(y),
  z: 3,
});

/** Three's Raycaster on its own, every triangle for every ray. */
function everyTriangle(target: Object3D, grid: RayGrid): (Intersection | undefined)[] {
  const ray = new Raycaster();
  return grid.ys.flatMap(y =>
    grid.xs.map(x => {
      ray.set(new Vector3(x, y, 3), new Vector3(0, 0, -1));
      return ray.intersectObject(target, true)[0];
    }),
  );
}

// What the face reads of a hit, and where it came from.
const reading = (hit: Intersection | undefined): unknown =>
  hit && {
    distance: hit.distance,
    point: hit.point.toArray(),
    normal: hit.face?.normal.toArray(),
    place: hit.object.matrixWorld.toArray(),
  };

/** What skinHits reads off each ray of `grid`, then what three's Raycaster does. */
function bothReadings(target: Object3D, grid: RayGrid): [unknown[], unknown[]] {
  return [skinHits(target, grid).map(reading), everyTriangle(target, grid).map(reading)];
}

const characters: Character[] = [
  ...CAST,
  ...CAST.flatMap(character => (character.facingLeft ? [character.facingLeft] : [])),
  robotFor(ROBOT_COACH_LEVEL),
];

describe('skinHits', () => {
  it.each(characters.map(character => [character.name, character] as const))(
    'finds what three’s Raycaster finds on %s’s skin',
    (_name, { body, face }) => {
      const [hits, reference] = bothReadings(
        placed(body.surface(), face.turn),
        gridOver(face.slide.x, face.slide.y),
      );
      expect(hits.some(Boolean)).toBe(true);
      expect(hits).toEqual(reference);
    },
    20_000,
  );

  it('finds the same on a skin of several meshes, one double-sided and one moved', () => {
    const sphere = new Mesh(new SphereGeometry(1, 24, 16));
    const bump = new Mesh(
      new SphereGeometry(0.3, 12, 8).toNonIndexed(),
      new MeshBasicMaterial({ side: DoubleSide }),
    );
    bump.position.set(0.4, 0.5, 0.6);
    const skin = new Group().add(sphere, bump);
    const [hits, reference] = bothReadings(placed(skin, 0.3), gridOver([-1.2, 1.2], [-1.2, 1.2]));
    expect(hits.some(Boolean)).toBe(true);
    expect(hits).toEqual(reference);
  });

  it('hands what isn’t a plain mesh to three’s Raycaster', () => {
    const points = new Points(new SphereGeometry(1, 8, 6));
    const target = placed(new Group().add(new Mesh(new SphereGeometry(1, 16, 12)), points));
    const [hits, reference] = bothReadings(target, gridOver([-1, 1], [-1, 1]));
    expect(hits).toEqual(reference);
  });
});
