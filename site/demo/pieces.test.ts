import { afterEach, describe, expect, it } from 'vitest';
import { setPieceRings } from './pieces.ts';

const root = document.documentElement;

afterEach(() => root.removeAttribute('style'));

describe('the rings of the set picked', () => {
  it('give a ringed set’s masks and edges, and take them off for one without', () => {
    setPieceRings(root, 'loop');
    expect(root.style.getPropertyValue('--ring-bN')).toMatch(/img\/pieces\/loop\/rings\/bN\.webp/);
    expect(root.style.getPropertyValue('--ring-edge-white')).toBe('0.819');
    expect(root.style.getPropertyValue('--ring-edge-black')).toBe('0.441');
    setPieceRings(root, 'mochi');
    expect(root.style.getPropertyValue('--ring-bN')).toBe('');
    expect(root.style.getPropertyValue('--ring-edge-white')).toBe('');
  });
});
