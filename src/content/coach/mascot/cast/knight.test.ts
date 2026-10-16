import { describe, expect, it } from 'vitest';
import { knight } from './knight.ts';

describe('the knight', () => {
  it('turns its head three quarters, the other way when it faces left', () => {
    const turn = knight.face.turn ?? 0;
    expect(turn).toBeGreaterThan(0.2);
    expect(knight.facingLeft?.face.turn).toBe(-turn);
    expect(knight.facingLeft?.ears?.turn).toBe(-turn);
  });

  it('turns whole to look, its face fixed on its head', () => {
    expect(knight.face.fixed).toBe(true);
    expect(knight.facingLeft?.face.fixed).toBe(true);
  });
});
