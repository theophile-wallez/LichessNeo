import { describe, expect, it } from 'vitest';
import { entry } from '#page/review/fixtures/practice.ts';
import { entryKey } from './repertoire.ts';
import { branchEntries, repertoireRows, type TreeRow, withoutBranch } from './repertoire-tree.ts';

// White's repertoire: 1. e4, against 1... e5 the Italian, against 1... c5 the Alapin or 2. Nf3.
const ENTRIES = [
  entry({ moves: [], answers: ['e4'], level: 5 }),
  entry({ moves: ['e4', 'e5'], answers: ['Nf3'], level: 5 }),
  entry({ moves: ['e4', 'e5', 'Nf3', 'Nc6'], answers: ['Bc4'], level: 5 }),
  entry({ moves: ['e4', 'c5'], answers: ['c3', 'Nf3'], level: 0 }),
  entry({ side: 'black', moves: ['d4'], answers: ['Nf6'] }),
];

/** The rows as text, each row's moves then its rows in brackets. */
const shape = (rows: readonly TreeRow[]): string =>
  rows
    .map(row => `${row.moves.join(' ')}${row.rows.length > 0 ? ` [${shape(row.rows)}]` : ''}`)
    .join(' | ');

describe('repertoireRows', () => {
  it('makes a row of each run of moves that doesn’t branch', () => {
    const rows = repertoireRows(ENTRIES, 'white');
    expect(shape(rows)).toBe('e4 [e5 Nf3 Nc6 Bc4 | c5 [c3 | Nf3]]');
    expect(rows[0]?.rows[1]?.rows[1]?.from).toEqual(['e4', 'c5']);
    expect(shape(repertoireRows(ENTRIES, 'black'))).toBe('d4 Nf6');
    expect(repertoireRows([], 'white')).toEqual([]);
  });

  it('says how well each row is known, from its positions on', () => {
    const [root] = repertoireRows(ENTRIES, 'white');
    expect(root?.mastery.positions).toBe(4);
    const [open, sicilian] = root?.rows ?? [];
    expect(open?.mastery).toMatchObject({ positions: 2, progress: 1 });
    expect(sicilian?.mastery).toMatchObject({ positions: 1, progress: 0, mastery: 'learning' });
  });
});

describe('branchEntries', () => {
  it('takes the positions past the move, and the one it answers', () => {
    expect(branchEntries(ENTRIES, ['e4'], 'e5').map(entryKey)).toEqual([
      'white|e4 e5',
      'white|e4 e5 Nf3 Nc6',
    ]);
    expect(branchEntries(ENTRIES, ['e4', 'e5'], 'Nf3').map(entryKey)).toEqual([
      'white|e4 e5',
      'white|e4 e5 Nf3 Nc6',
    ]);
    expect(branchEntries(ENTRIES, ['e4', 'e5'], 'Bc4')).toEqual([]);
  });
});

describe('withoutBranch', () => {
  it('prunes the move and the line after it', () => {
    const pruned = withoutBranch(ENTRIES, 'white', { from: ['e4'], san: 'e5' });
    expect(pruned.map(entryKey)).toEqual(['white|', 'white|e4 c5', 'black|d4']);
  });

  it('keeps the position the move answered, without it, while it has others', () => {
    const pruned = withoutBranch(ENTRIES, 'white', { from: ['e4', 'c5'], san: 'c3' });
    expect(pruned.find(each => entryKey(each) === 'white|e4 c5')?.answers).toEqual(['Nf3']);
    const all = withoutBranch(pruned, 'white', { from: ['e4', 'c5'], san: 'Nf3' });
    expect(all.map(entryKey)).not.toContain('white|e4 c5');
    expect(all).toHaveLength(4);
  });

  it('leaves the other side alone', () => {
    expect(withoutBranch(ENTRIES, 'black', { from: [], san: 'e4' })).toEqual(ENTRIES);
  });
});
