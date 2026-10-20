import { describe, expect, it } from 'vitest';
import type { Piece } from '#shared/chess/index.ts';
import { pairOf as pairEn } from './en-grammar.ts';
import { pairOf as pairFr } from './fr-grammar.ts';
import type { Viewer } from './types.ts';

const black = (role: Piece['role']): Piece => ({ role, color: 'black' });

// Watching, as White, as Black: whose the pieces are.
const VIEWERS: readonly Viewer[] = [null, 'white', 'black'];

describe('pairOf', () => {
  it('names two pieces of a kind as a pair, whoever reads', () => {
    const knights = [black('knight'), black('knight')] as const;
    expect(VIEWERS.map(viewer => pairEn(viewer, ...knights))).toEqual([
      'both [[p:bn]]knights',
      'both the opponent’s [[p:bn]]knights',
      'both your [[p:bn]]knights',
    ]);
    expect(VIEWERS.map(viewer => pairFr(viewer, ...knights))).toEqual([
      'les deux [[p:bn]]cavaliers',
      'les deux [[p:bn]]cavaliers adverses',
      'tes deux [[p:bn]]cavaliers',
    ]);
  });

  it('names two pieces of different kinds one by one', () => {
    const pieces = [black('bishop'), black('queen')] as const;
    expect(pairEn(null, ...pieces)).toBe('the [[p:bb]]bishop and the [[p:bq]]queen');
    expect(pairEn('black', ...pieces)).toBe('your [[p:bb]]bishop and your [[p:bq]]queen');
    expect(pairFr(null, ...pieces)).toBe('le [[p:bb]]fou et la [[p:bq]]dame');
    expect(pairFr('white', ...pieces)).toBe('le [[p:bb]]fou adverse et la [[p:bq]]dame adverse');
  });
});
