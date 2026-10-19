import { BufferGeometry, Mesh, Object3D, Raycaster, Vector3, type Intersection } from 'three';

// The face's grid of rays, each tested against the triangles in front of it only.
// Three's Raycaster tests every triangle of the skin for every ray, a few hundred
// rays over thousands of triangles as a coach appears. The hits are still three's
// own, from Mesh.raycast over a copy of each mesh that holds just those triangles,
// so they're the same to the bit.

/** Where the rays start: one per (x, y), from `z`, all going toward -z. */
export interface RayGrid {
  readonly xs: readonly number[];
  readonly ys: readonly number[];
  readonly z: number;
}

// How much wider than a triangle a ray may pass and still be tested: well over the float
// error of putting its corners in world space, well under the grid's step.
const MARGIN = 1e-4;

const FORWARD = new Vector3(0, 0, -1);

// With three's own defaults for its parts, where `instanceof` alone leaves them untyped.
const isMesh = (object: Object3D): object is Mesh => object instanceof Mesh;

// What Mesh.raycast reads of a mesh as these copies do: one material, no morphs, all drawn.
function isPlainMesh(object: Object3D): object is Mesh {
  if (!isMesh(object) || object.constructor !== Mesh || Array.isArray(object.material))
    return false;
  const { geometry } = object;
  const { drawRange, index } = geometry;
  const whole = index !== null || geometry.getAttribute('position').count % 3 === 0;
  return (
    geometry.morphAttributes['position'] === undefined &&
    drawRange.start === 0 &&
    drawRange.count === Infinity &&
    whole
  );
}

/** The first of the sorted `values` at least `low`, and the last at most `high`. */
function within(values: readonly number[], low: number, high: number): [number, number] {
  let first = 0;
  while (first < values.length && (values[first] ?? 0) < low) first++;
  let last = first - 1;
  while (last + 1 < values.length && (values[last + 1] ?? 0) <= high) last++;
  return [first, last];
}

/** Each ray's triangles in `mesh`, as its three corners' indices, in the mesh's own order. */
function trianglesInFront(mesh: Mesh, grid: RayGrid): number[][] {
  const { geometry, matrixWorld } = mesh;
  const position = geometry.getAttribute('position');
  const corners = new Float64Array(position.count * 2);
  const corner = new Vector3();
  for (let vertex = 0; vertex < position.count; vertex++) {
    corner.fromBufferAttribute(position, vertex).applyMatrix4(matrixWorld);
    corners[vertex * 2] = corner.x;
    corners[vertex * 2 + 1] = corner.y;
  }
  const buckets: number[][] = Array.from({ length: grid.xs.length * grid.ys.length }, () => []);
  const { index } = geometry;
  const count = index ? index.count : position.count;
  for (let start = 0; start + 2 < count; start += 3) {
    const triangle = [0, 1, 2].map(side => (index ? index.getX(start + side) : start + side));
    const xs = triangle.map(vertex => corners[vertex * 2] ?? 0);
    const ys = triangle.map(vertex => corners[vertex * 2 + 1] ?? 0);
    const [left, right] = within(grid.xs, Math.min(...xs) - MARGIN, Math.max(...xs) + MARGIN);
    const [bottom, top] = within(grid.ys, Math.min(...ys) - MARGIN, Math.max(...ys) + MARGIN);
    for (let row = bottom; row <= top; row++)
      for (let column = left; column <= right; column++)
        buckets[row * grid.xs.length + column]?.push(...triangle);
  }
  return buckets;
}

interface Copy {
  readonly mesh: Mesh;
  readonly buckets: number[][];
}

// The mesh's place and material over its positions; its bounds are the mesh's, so
// Mesh.raycast passes on or turns down the ray as for the mesh itself.
function copyOf(mesh: Mesh): Mesh {
  const { geometry } = mesh;
  if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
  const triangles = new BufferGeometry();
  triangles.setAttribute('position', geometry.getAttribute('position'));
  triangles.boundingSphere = geometry.boundingSphere;
  triangles.boundingBox = geometry.boundingBox;
  const copy = new Mesh(triangles, mesh.material);
  copy.matrixAutoUpdate = false;
  copy.matrixWorldAutoUpdate = false;
  copy.matrixWorld.copy(mesh.matrixWorld);
  return copy;
}

/**
 * The nearest hit of each ray of `grid` on `target`, row by row, x fastest: what
 * `new Raycaster(origin, -z).intersectObject(target, true)[0]` finds, `target`'s matrices updated.
 */
export function skinHits(target: Object3D, grid: RayGrid): (Intersection | undefined)[] {
  const ray = new Raycaster();
  const origin = (column: number, row: number): Vector3 =>
    new Vector3(grid.xs[column] ?? 0, grid.ys[row] ?? 0, grid.z);
  const meshes: Mesh[] = [];
  let plain = true;
  // Anything else that a ray may hit (a group hits nothing) goes through three's Raycaster.
  target.traverse(object => {
    if (isPlainMesh(object)) meshes.push(object);
    else if (object.raycast !== Object3D.prototype.raycast) plain = false;
  });
  const hits: (Intersection | undefined)[] = [];
  if (!plain) {
    for (let row = 0; row < grid.ys.length; row++)
      for (let column = 0; column < grid.xs.length; column++) {
        ray.set(origin(column, row), FORWARD);
        hits.push(ray.intersectObject(target, true)[0]);
      }
    return hits;
  }
  const copies: Copy[] = meshes.map(mesh => ({
    mesh: copyOf(mesh),
    buckets: trianglesInFront(mesh, grid),
  }));
  for (let row = 0; row < grid.ys.length; row++)
    for (let column = 0; column < grid.xs.length; column++) {
      const cell = row * grid.xs.length + column;
      const tested = copies.filter(({ buckets }) => (buckets[cell]?.length ?? 0) > 0);
      for (const { mesh, buckets } of tested) mesh.geometry.setIndex(buckets[cell] ?? []);
      ray.set(origin(column, row), FORWARD);
      hits.push(
        ray.intersectObjects(
          tested.map(({ mesh }) => mesh),
          false,
        )[0],
      );
    }
  for (const { mesh } of copies) mesh.geometry.dispose();
  return hits;
}
