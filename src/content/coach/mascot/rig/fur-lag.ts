import { Quaternion, Vector3 } from 'three';
import type { FurPart } from '#content/coach/mascot/fur/fur.ts';

// Fur lags behind a moving part and hangs under gravity.

const world = new Vector3();
const velocity = new Vector3();
const rotation = new Quaternion();

export function bendFur(parts: readonly FurPart[], dt: number): void {
  for (const part of parts) {
    world.copy(part.probe).applyMatrix4(part.mesh.matrixWorld);
    if (part.last && dt > 0) velocity.subVectors(world, part.last).divideScalar(dt);
    else velocity.set(0, 0, 0);
    part.last = (part.last ?? new Vector3()).copy(world);
    part.lag.lerp(velocity.multiplyScalar(-0.09).clampLength(0, 0.9), 1 - Math.exp(-12 * dt));
    part.bend.set(0, -0.12, 0).add(part.lag);
    part.mesh.getWorldQuaternion(rotation).invert();
    part.bend.applyQuaternion(rotation);
  }
}
