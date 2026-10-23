import { describe, expect, it } from 'vitest';
import { entry } from '#page/review/fixtures/practice.ts';
import { treeEntries } from './chapters.ts';
import { parseMovetext, writeMovetext } from './pgn-tree.ts';
import { entryKey } from './repertoire.ts';
import { prunedTree, withoutPruned } from './sync-prune.ts';

const ENTRIES = [
  entry({ moves: ['e4', 'e5'], answers: ['Nf3', 'Bc4'] }),
  entry({ moves: ['e4', 'e5', 'Nf3', 'Nc6'], answers: ['Bb5'] }),
  entry({ moves: ['e4', 'c5'], answers: ['c3'] }),
  entry({ side: 'black', moves: ['e4'], answers: ['e5'] }),
];

describe('withoutPruned', () => {
  it('leaves the lines removed out of what’s read back', () => {
    const kept = withoutPruned({ pruned: ['white|e4 e5 Nf3', 'black|e4 e5'] }, ENTRIES);
    expect(kept.map(each => [entryKey(each), each.answers])).toEqual([
      ['white|e4 e5', ['Bc4']],
      ['white|e4 c5', ['c3']],
    ]);
  });

  it('reads everything with nothing removed, or a removal it can’t read', () => {
    expect(withoutPruned({}, ENTRIES)).toEqual(ENTRIES);
    expect(withoutPruned({ pruned: ['red|e4', 'white|', 'white'] }, ENTRIES)).toEqual(ENTRIES);
  });
});

describe('prunedTree', () => {
  it('cuts the lines removed from a side’s chapter', () => {
    const tree = parseMovetext('1. e4 e5 (1... c5 2. c3) 2. Nf3 (2. Bc4) 2... Nc6 3. Bb5');
    const state = { pruned: ['white|e4 e5 Nf3', 'black|e4 c5', 'white|d4 d5'] };
    expect(writeMovetext(prunedTree(state, 'white', tree))).toBe(
      '1. e4 e5 (1... c5 2. c3) 2. Bc4 *',
    );
  });

  it('takes the record off a position left with no move, not the user’s words', () => {
    const tree = parseMovetext(
      '1. e4 e5 { Mine. Lichess Neo · seen 2 · missed 0 · last 2026-10-23 09:05 UTC } 2. Nf3',
    );
    const pruned = prunedTree({ pruned: ['white|e4 e5 Nf3'] }, 'white', tree);
    expect(writeMovetext(pruned)).toBe('1. e4 e5 { Mine. } *');
    expect(treeEntries(pruned, 'white', 'Open Game')).toEqual([]);
  });

  it('leaves a tree without the lines alone', () => {
    const tree = parseMovetext('1. d4 d5');
    expect(writeMovetext(prunedTree({ pruned: ['white|e4'] }, 'white', tree))).toBe('1. d4 d5 *');
  });
});
