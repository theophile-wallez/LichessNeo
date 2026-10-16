import { type BufferGeometry, Material, Mesh, type Object3D } from 'three';

// A three.js scene's meshes, typed, for tests that read what a mascot draws.

export interface DrawnMesh {
  readonly mesh: Object3D;
  readonly geometry: BufferGeometry;
  readonly material: Material;
}

// With three's own defaults for its parts, where `instanceof` alone leaves them untyped.
const isMesh = (object: Object3D): object is Mesh => object instanceof Mesh;

/** Every mesh under `root` (itself too) with one material. */
export function meshesIn(root: Object3D): DrawnMesh[] {
  const found: DrawnMesh[] = [];
  root.traverse(object => {
    if (!isMesh(object)) return;
    const { geometry, material } = object;
    if (material instanceof Material) found.push({ mesh: object, geometry, material });
  });
  return found;
}
