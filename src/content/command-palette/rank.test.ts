import { describe, expect, it } from 'vitest';
import { matchScore, rank } from './rank.ts';

const entry = (label: string, keywords?: string) => (keywords ? { label, keywords } : { label });

describe('the palette’s ranking', () => {
  it('ranks a label’s start over a word’s, over anywhere in it, over its section', () => {
    expect(matchScore('puz', entry('Puzzles'))).toBe(4);
    expect(matchScore('the', entry('Puzzle Themes'))).toBe(3);
    expect(matchScore('zzl', entry('Puzzles'))).toBe(2);
    expect(matchScore('tools', entry('Board editor', 'Tools'))).toBe(1);
    expect(matchScore('storm', entry('Puzzles'))).toBe(0);
  });

  it('ignores accents and case', () => {
    expect(matchScore('ECHIQUIER', entry('Échiquier d’analyse'))).toBe(4);
  });

  it('keeps every entry, in order, for an empty query', () => {
    const entries = [entry('Play'), entry('Puzzles')];
    expect(rank(entries, '  ')).toEqual(entries);
  });

  it('puts the best matches first, in their own order between equals', () => {
    const entries = [entry('Board editor', 'Tools'), entry('Puzzle Racer'), entry('Racer')];
    expect(rank(entries, 'racer').map(found => found.label)).toEqual(['Racer', 'Puzzle Racer']);
    expect(rank([entry('Teams'), entry('Tournaments')], 't').map(found => found.label)).toEqual([
      'Teams',
      'Tournaments',
    ]);
  });
});
