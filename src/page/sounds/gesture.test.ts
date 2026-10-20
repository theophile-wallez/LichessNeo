import { describe, expect, it } from 'vitest';
import { parsePlacement } from '#shared/chess/fen.ts';
import { gestureOfSan, gestureOnBoard, slideReach } from './gesture.ts';

describe('slideReach', () => {
  it.each([
    { role: 'bishop', from: 'c1', to: 'h6', reach: 5 },
    { role: 'rook', from: 'a1', to: 'a8', reach: 7 },
    { role: 'queen', from: 'd1', to: 'd3', reach: 2 },
    { role: 'pawn', from: 'e2', to: 'e4', reach: 2 },
    { role: 'rook', from: 'a1', to: 'a2', reach: null },
    { role: 'pawn', from: 'e2', to: 'e3', reach: null },
    { role: 'king', from: 'e1', to: 'g1', reach: null },
    { role: 'knight', from: 'g1', to: 'f3', reach: null },
  ] as const)('$role from $from to $to: $reach', ({ role, from, to, reach }) => {
    expect(slideReach(role, from, to)).toBe(reach);
  });
});

describe('gestureOfSan', () => {
  it('slides a long move, by its UCI', () => {
    expect(gestureOfSan('Bxh6', 'c1h6')).toEqual({ reach: 5, jumped: false, promoted: false });
    expect(gestureOfSan('e4', 'e2e4')).toEqual({ reach: 2, jumped: false, promoted: false });
  });

  it('jumps a knight, and sets a short move down', () => {
    expect(gestureOfSan('Nf3', 'g1f3')).toEqual({ reach: null, jumped: true, promoted: false });
    expect(gestureOfSan('Kd2', 'e1d2')).toEqual({ reach: null, jumped: false, promoted: false });
  });

  it('knows no slide without a UCI', () => {
    expect(gestureOfSan('Ra8', undefined)).toEqual({ reach: null, jumped: false, promoted: false });
  });

  it('promotes a pawn that reaches the last rank, capturing or not', () => {
    expect(gestureOfSan('exd8=Q+', 'e7d8q')).toEqual({
      reach: null,
      jumped: false,
      promoted: true,
    });
    expect(gestureOfSan('e8=N', 'e7e8n')?.promoted).toBe(true);
  });

  it('has none for castling, nor for a drop from the pocket', () => {
    expect(gestureOfSan('O-O', 'e1g1')).toBeNull();
    expect(gestureOfSan('N@f3', undefined)).toBeNull();
    expect(gestureOfSan('@e4', undefined)).toBeNull();
  });
});

describe('gestureOnBoard', () => {
  it('reads the move the board highlights, its piece where it went', () => {
    const pieces = parsePlacement('4k3/8/8/8/8/8/8/R3K3');
    expect(gestureOnBoard(pieces, ['a8', 'a1'], null)).toEqual({
      reach: 7,
      jumped: false,
      promoted: false,
    });
  });

  it('tells a promotion from the pawn before it, once auto-queen made it a queen', () => {
    const before = parsePlacement('3rk3/4P3/8/8/8/8/8/4K3');
    const after = parsePlacement('3Qk3/8/8/8/8/8/8/4K3');
    expect(gestureOnBoard(after, ['e7', 'd8'], before)?.promoted).toBe(true);
    expect(gestureOnBoard(after, ['e7', 'd8'], null)?.promoted).toBe(false);
  });

  it('has none for a drop, which highlights one square, nor without a highlight', () => {
    const pieces = parsePlacement('4k3/8/8/8/8/5N2/8/4K3');
    expect(gestureOnBoard(pieces, ['f3'], null)).toBeNull();
    expect(gestureOnBoard(pieces, [], null)).toBeNull();
  });
});
