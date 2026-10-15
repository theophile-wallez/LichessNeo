import {
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  type Object3D,
} from 'three';
import { z } from 'zod/mini';
import type { FurTuning } from './settings.ts';

// Scales a mascot's fur from outside its rig: each furry part's length,
// density and number of shells, relative to what its character gave it.

interface Base {
  readonly length: number;
  readonly density: number;
  readonly layers: number;
}

// Read once per material, before the first tuning changes them.
const bases = new WeakMap<ShaderMaterial, Base>();

const UniformSchema = z.object({ value: z.number() });

function baseOf(material: ShaderMaterial, geometry: InstancedBufferGeometry): Base | null {
  const known = bases.get(material);
  if (known) return known;
  const length = UniformSchema.safeParse(material.uniforms.uLength);
  const density = UniformSchema.safeParse(material.uniforms.uDensity);
  if (!length.success || !density.success) return null;
  const base = {
    length: length.data.value,
    density: density.data.value,
    layers: geometry.instanceCount,
  };
  bases.set(material, base);
  return base;
}

/** Shells from the skin (0) to the tips (1), as fur.ts lays them out. */
function layerHeights(layers: number): Float32Array {
  return Float32Array.from({ length: layers }, (_, i) => (layers > 1 ? i / (layers - 1) : 0));
}

function tune(material: unknown, geometry: unknown, tuning: FurTuning): void {
  if (!(material instanceof ShaderMaterial) || !(geometry instanceof InstancedBufferGeometry))
    return;
  const base = baseOf(material, geometry);
  if (!base) return;
  const { uLength, uDensity } = material.uniforms;
  if (uLength) uLength.value = base.length * tuning.length;
  if (uDensity) uDensity.value = base.density * tuning.density;
  // A part with a single shell (a robot's) has no fur to thicken.
  const layers = base.layers > 1 ? Math.max(2, Math.round(base.layers * tuning.layers)) : 1;
  if (layers === geometry.instanceCount) return;
  geometry.setAttribute('layer', new InstancedBufferAttribute(layerHeights(layers), 1));
  geometry.instanceCount = layers;
}

export function tuneFur(root: Object3D, tuning: FurTuning): void {
  root.traverse(object => {
    if (object instanceof Mesh) tune(object.material, object.geometry, tuning);
  });
}
