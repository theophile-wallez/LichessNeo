import { describe, expect, it } from 'vitest';
import type { Piece } from '#shared/chess/index.ts';
import { pairOf as pairEn } from './en-grammar.ts';
import { fr, french } from './fr.ts';
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

describe('the French sentences', () => {
  it('elide « te » before a vowel, and agree with the pieces they name', () => {
    const toWhite = french('white');
    expect(toWhite.facts.checkForces('white')).toContain('Échec : il t’oblige à répondre.');
    const forked = toWhite.facts.forks(black('queen'), black('rook')).join(' ');
    expect(forked).toContain('sont prises en même temps');
    const both = toWhite.facts.forks(black('queen'), black('knight')).join(' ');
    expect(both).toContain('sont pris en même temps');
  });

  it('name the piece of the retry’s second hint by its gender', () => {
    const { hintSquare } = fr.ui.retry;
    expect(hintSquare('d1', black('queen'))).toMatch(/^Elle part de la case d1/);
    expect(hintSquare('g1', black('knight'))).toMatch(/^Il part de la case g1/);
  });
});
