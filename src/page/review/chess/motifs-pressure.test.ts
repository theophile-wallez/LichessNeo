import { describe, expect, it } from 'vitest';
import { isPressureKind, PRESSURE_PIECES } from './motifs-pressure.ts';

describe('isPressureKind', () => {
  it('knows the motifs that win by pressure', () => {
    const kinds = ['deflection', 'chasedDefender', 'doubleAttack', 'outnumbered', 'attacked'];
    expect(kinds.filter(isPressureKind)).toEqual(kinds);
  });

  it('leaves out the sharper motifs', () => {
    const sharper = ['fork', 'pin', 'skewer', 'discoveredAttack', 'hangingPiece', 'pinnedDefender'];
    expect(sharper.filter(isPressureKind)).toEqual([]);
  });

  it('takes no object’s built-in name for a motif', () => {
    expect(['toString', 'constructor'].filter(isPressureKind)).toEqual([]);
  });
});

describe('PRESSURE_PIECES', () => {
  it('counts a defender and its target, two targets, or one', () => {
    expect(PRESSURE_PIECES).toEqual({
      deflection: 2,
      chasedDefender: 2,
      doubleAttack: 2,
      outnumbered: 1,
      attacked: 1,
    });
  });
});
