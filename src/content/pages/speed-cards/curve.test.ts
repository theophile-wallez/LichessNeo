import { describe, expect, it } from 'vitest';
import { curvePaths } from './curve.ts';

describe('curvePaths', () => {
  it('needs two ratings to draw a line', () => {
    expect(curvePaths([])).toBeNull();
    expect(curvePaths([1500])).toBeNull();
  });

  it('spans the box, the highest rating near the top, the area closed under it', () => {
    const paths = curvePaths([1500, 1600]);
    expect(paths?.line).toMatch(/^M0,27C.*100,3$/);
    expect(paths?.area).toBe(`${paths?.line}L100,30L0,30Z`);
  });

  it('draws a flat history across the middle of the room it has', () => {
    expect(curvePaths([1500, 1500])?.line).toMatch(/^M0,15C.*100,15$/);
  });
});
