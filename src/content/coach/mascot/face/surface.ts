import { Group, MathUtils, Mesh, Object3D, Raycaster, Vector3, type BufferGeometry } from 'three';

// Where the body's skin is in front of each point of the face, sampled once on
// a grid so the features can slide over it every frame. A face turned from ahead
// (a head in three quarters) samples the skin as seen from where it faces.

const STEP = 0.05;

export type Range = readonly [number, number];

interface Sample {
  readonly z: number;
  readonly normal: Vector3;
}

export interface SkinPoint {
  readonly point: Vector3;
  readonly normal: Vector3;
}

export class Surface {
  readonly #x: Range;
  readonly #y: Range;
  readonly #columns: number;
  readonly #rows: number;
  readonly #samples: Sample[] = [];

  /**
   * Samples `skin` (a geometry, or meshes already placed) over the ranges the face can slide
   * across, facing `turn` radians about the vertical from ahead.
   */
  constructor(
    skin: BufferGeometry | Object3D,
    ranges: { readonly x: Range; readonly y: Range },
    turn = 0,
  ) {
    this.#x = ranges.x;
    this.#y = ranges.y;
    const target = new Group().add(skin instanceof Object3D ? skin : new Mesh(skin));
    target.rotation.y = -turn;
    target.updateMatrixWorld(true);
    const ray = new Raycaster();
    const forward = new Vector3(0, 0, -1);
    this.#columns = Math.round((this.#x[1] - this.#x[0]) / STEP) + 1;
    this.#rows = Math.round((this.#y[1] - this.#y[0]) / STEP) + 1;
    for (let row = 0; row < this.#rows; row++)
      for (let column = 0; column < this.#columns; column++) {
        ray.set(new Vector3(this.#x[0] + column * STEP, this.#y[0] + row * STEP, 3), forward);
        const [hit] = ray.intersectObject(target, true);
        const normal = hit?.face?.normal.clone().transformDirection(hit.object.matrixWorld);
        // Past the head's edge, keep the sample below: the face never goes there anyway.
        const below = this.#samples.at(-this.#columns) ?? { z: 0, normal: new Vector3(0, 0, 1) };
        this.#samples.push(hit && normal ? { z: hit.point.z, normal } : below);
      }
  }

  #sample(column: number, row: number): Sample {
    return this.#samples[row * this.#columns + column] ?? { z: 0, normal: new Vector3(0, 0, 1) };
  }

  /** The skin's point and normal in front of (x, y), written into `into`. */
  at(x: number, y: number, into: SkinPoint): SkinPoint {
    const across = MathUtils.clamp((x - this.#x[0]) / STEP, 0, this.#columns - 1.001);
    const up = MathUtils.clamp((y - this.#y[0]) / STEP, 0, this.#rows - 1.001);
    const [column, row] = [Math.floor(across), Math.floor(up)];
    const [right, top] = [across - column, up - row];
    const corners: readonly [Sample, number][] = [
      [this.#sample(column, row), (1 - right) * (1 - top)],
      [this.#sample(column + 1, row), right * (1 - top)],
      [this.#sample(column, row + 1), (1 - right) * top],
      [this.#sample(column + 1, row + 1), right * top],
    ];
    into.point.set(x, y, 0);
    into.normal.set(0, 0, 0);
    for (const [corner, weight] of corners) {
      into.point.z += corner.z * weight;
      into.normal.addScaledVector(corner.normal, weight);
    }
    into.normal.normalize();
    return into;
  }
}
