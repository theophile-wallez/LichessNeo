import { Group, MeshStandardMaterial, SphereGeometry, Vector3, type BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { type DrawnMesh, meshesIn } from '#shared/testing/meshes.ts';
import { NEUTRAL } from '#content/coach/mascot/pose.ts';
import { Cheeks } from './cheek.ts';
import { Face, type FaceLook } from './face.ts';
import { Surface, type SkinPoint } from './surface.ts';

const RADIUS = 1;
const surface = new Surface(new SphereGeometry(RADIUS, 64, 48), {
  x: [-0.8, 0.8],
  y: [-0.6, 0.9],
});
const skin = (): SkinPoint => ({ point: new Vector3(), normal: new Vector3() });

const LOOK: FaceLook = {
  center: [0, 0.3],
  size: [0.46, 0.32],
  slide: { x: [-0.6, 0.6], y: [-0.4, 0.8] },
  eyes: { x: 0.24, y: 0.35, size: 1 },
  brows: { y: 0.5, color: '#333333' },
  nose: null,
  mouth: { y: 0.15, scale: 1 },
  cheeks: { x: 0.36, y: 0.22 },
};

const opacity = ({ material }: DrawnMesh): number => material.opacity;
const freckled = ({ material }: DrawnMesh): boolean =>
  material instanceof MeshStandardMaterial && material.color.getHexString() === 'e0609a';

/** The round blushes and the freckles, told apart by their color. */
function cheekMeshes(group: Group): { round: DrawnMesh[]; freckles: DrawnMesh[] } {
  const meshes = meshesIn(group).filter(({ mesh }) => mesh !== group);
  return { round: meshes.filter(mesh => !freckled(mesh)), freckles: meshes.filter(freckled) };
}

function points(geometry: BufferGeometry | undefined): Vector3[] {
  const position = geometry?.getAttribute('position');
  if (!position) return [];
  return Array.from({ length: position.count }, (_, i) =>
    new Vector3().fromBufferAttribute(position, i),
  );
}

const shown = ({ mesh }: DrawnMesh): boolean => mesh.visible;
const placed = (face: Face): Vector3[] => face.group.children.map(child => child.position.clone());

describe('Cheeks', () => {
  it('show a round blush at rest, and turn to freckles as the face blushes', () => {
    const group = new Group();
    const cheeks = new Cheeks(group, { x: 0.36, y: 0.2 }, { x: 0, y: 0 }, 0.01);
    const { round, freckles } = cheekMeshes(group);
    expect([round.length, freckles.length]).toEqual([2, 2]);

    cheeks.update(surface, { x: 0, y: 0 }, 0, skin());
    expect(round.every(mesh => shown(mesh) && opacity(mesh) > 0.5)).toBe(true);
    expect(freckles.some(shown)).toBe(false);

    cheeks.update(surface, { x: 0, y: 0 }, 1, skin());
    expect(round.some(shown)).toBe(false);
    expect(freckles.every(mesh => shown(mesh) && opacity(mesh) > 0.5)).toBe(true);
  });

  it('keep their freckles at rest when drawn so, and none where the face has no cheeks', () => {
    const freckled = new Group();
    new Cheeks(freckled, { x: 0.3, y: 0.2, style: 'freckles' }, { x: 0, y: 0 }, 0.01).update(
      surface,
      { x: 0, y: 0 },
      0,
      skin(),
    );
    expect(cheekMeshes(freckled).round).toHaveLength(0);
    expect(cheekMeshes(freckled).freckles.every(shown)).toBe(true);

    const bare = new Group();
    const cheeks = new Cheeks(bare, null, { x: 0.3, y: 0.2 }, 0.01);
    cheeks.update(surface, { x: 0, y: 0 }, 0, skin());
    expect(cheekMeshes(bare).freckles.some(shown)).toBe(false);
    cheeks.update(surface, { x: 0, y: 0 }, 1, skin());
    expect(cheekMeshes(bare).freckles.every(shown)).toBe(true);
  });

  it('lie on the skin point by point, however it curves away', () => {
    const group = new Group();
    const lift = 0.01;
    // Far out on the side, where a flat disc would stand off the sphere.
    new Cheeks(group, { x: 0.7, y: 0.2 }, { x: 0, y: 0 }, lift).update(
      surface,
      { x: 0, y: 0 },
      0,
      skin(),
    );
    const laid = points(cheekMeshes(group).round[0]?.geometry);
    expect(laid.length).toBeGreaterThan(20);
    for (const point of laid) expect(point.length()).toBeCloseTo(RADIUS + lift, 2);
  });
});

const glanced = (look: FaceLook): { before: Vector3[]; after: Vector3[] } => {
  const face = new Face(surface, look, false);
  face.update(NEUTRAL, { blink: 1, x: 0, y: 0 });
  const before = placed(face);
  face.update(NEUTRAL, { blink: 1, x: 1, y: 0.5 });
  return { before, after: placed(face) };
};

describe('Face', () => {
  it('slides over the skin as the head turns to look', () => {
    const { before, after } = glanced(LOOK);
    expect(after.some((point, i) => point.distanceTo(before[i] ?? point) > 0.05)).toBe(true);
  });

  it('stays put on the head when fixed: the mascot turns whole instead', () => {
    const { before, after } = glanced({ ...LOOK, fixed: true });
    for (const [i, point] of after.entries()) expect(point.distanceTo(before[i] ?? point)).toBe(0);
  });
});
