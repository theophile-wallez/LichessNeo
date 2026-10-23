import { describe, expect, it } from 'vitest';
import { entry } from '#page/review/fixtures/practice.ts';
import {
  chapterOf,
  dataComment,
  lineRecord,
  OTHER_CHAPTER,
  readRecord,
  toMinute,
  treeEntries,
  withEntries,
} from './chapters.ts';
import { parseMovetext, writeMovetext } from './pgn-tree.ts';

const LAST = Date.UTC(2026, 9, 23, 9, 5);
const DUE = Date.UTC(2026, 9, 26, 9, 5);

const ITALIAN = entry({
  moves: ['e4', 'e5', 'Nf3', 'Nc6'],
  name: 'Italian Game',
  answers: ['Bc4', 'Bb5'],
  seen: 4,
  missed: 1,
  level: 2,
  last: LAST,
  due: DUE,
});

describe('chapters', () => {
  it('put an opening in its family’s chapter', () => {
    expect(chapterOf('Italian Game: Evans Gambit, Accepted')).toBe('Italian Game');
    expect(chapterOf('Ruy Lopez')).toBe('Ruy Lopez');
    expect(chapterOf('')).toBe(OTHER_CHAPTER);
  });

  it('keep times to the minute', () => {
    expect(toMinute(LAST + 59_999)).toBe(LAST);
  });
});

describe('a position’s record in a comment', () => {
  it('is written in words, a time to the minute', () => {
    expect(dataComment(ITALIAN)).toBe(
      'Lichess Neo · seen 4 · missed 1 · last 2026-10-23 09:05 UTC · level 2 · review 2026-10-26 09:05 UTC · opening Italian Game',
    );
    expect(dataComment({ ...ITALIAN, due: 0, name: '' })).toBe(
      'Lichess Neo · seen 4 · missed 1 · last 2026-10-23 09:05 UTC',
    );
  });

  it('reads back, after the user’s own words', () => {
    const record = { seen: 4, missed: 1, level: 2, last: LAST, due: DUE, name: 'Italian Game' };
    expect(readRecord(dataComment(ITALIAN))).toEqual(record);
    expect(
      readRecord(`The main line. ${dataComment({ ...ITALIAN, last: LAST + 30_000 })}`),
    ).toEqual(record);
    expect(readRecord(dataComment({ ...ITALIAN, due: 0 }))).toEqual({
      ...record,
      level: 0,
      due: 0,
    });
    expect(readRecord(dataComment({ ...ITALIAN, name: '' }))?.name).toBeNull();
  });

  it('keeps the opening’s own name, not its chapter’s', () => {
    const piano = { ...ITALIAN, name: 'Italian Game: Giuoco Piano', moves: ['e4', 'e5'] };
    const tree = withEntries(null, [piano]);
    expect(treeEntries(tree, 'white', chapterOf(piano.name))[0]?.name).toBe(piano.name);
    const unnamed = withEntries(null, [{ ...piano, name: '' }]);
    expect(treeEntries(unnamed, 'white', OTHER_CHAPTER)[0]?.name).toBe(OTHER_CHAPTER);
  });

  it('is nothing in another comment, or one cut short', () => {
    expect(readRecord('A great move, seen 4 times')).toBeNull();
    expect(readRecord('')).toBeNull();
    expect(readRecord('Lichess Neo · seen 4 · missed 1')).toBeNull();
    expect(readRecord('Lichess Neo · seen 4 · missed 1 · last 2026-13-45 99:99 UTC')).toBeNull();
  });
});

describe('a chapter’s tree', () => {
  it('gets the positions written in, the repertoire’s move first', () => {
    const tree = withEntries(null, [
      ITALIAN,
      entry({ moves: [], answers: ['e4'], seen: 9, last: LAST }),
    ]);
    expect(writeMovetext(tree)).toBe(
      `{ ${dataComment(entry({ moves: [], seen: 9, last: LAST }))} } 1. e4 e5 2. Nf3 Nc6 { ${dataComment(ITALIAN)} } 3. Bc4 (3. Bb5) *`,
    );
  });

  it('keeps the user’s moves and words, our record in place of the last', () => {
    const before = parseMovetext(
      `1. e4 e5 2. Nf3 Nc6 { My line. ${dataComment({ ...ITALIAN, seen: 1 })} } 3. d4 (3. Bb5) *`,
    );
    const tree = withEntries(before, [ITALIAN]);
    expect(writeMovetext(tree)).toBe(
      `1. e4 e5 2. Nf3 Nc6 { My line. ${dataComment(ITALIAN)} } 3. Bc4 (3. Bb5) (3. d4) *`,
    );
    // The tree it was given stays as it was.
    expect(before.children[0]?.children[0]?.children[0]?.children[0]?.children).toHaveLength(2);
  });

  it('gives back the positions of the side whose turn they are', () => {
    const tree = withEntries(null, [ITALIAN]);
    expect(treeEntries(tree, 'white', 'Italian Game')).toEqual([
      { ...ITALIAN, last: toMinute(ITALIAN.last), due: toMinute(ITALIAN.due) },
    ]);
    expect(treeEntries(tree, 'black', 'Italian Game')).toEqual([]);
  });
});

describe('lineRecord', () => {
  it('sums the positions past a line', () => {
    const entries = [
      ITALIAN,
      entry({ moves: ['e4', 'e5'], seen: 2, missed: 2 }),
      entry({ moves: ['d4'], seen: 5 }),
      entry({ side: 'black', moves: ['e4'], seen: 7 }),
    ];
    expect(lineRecord(entries, 'white', ['e4'])).toEqual({ positions: 2, seen: 6, missed: 3 });
    expect(lineRecord(entries, 'white', [])).toEqual({ positions: 3, seen: 11, missed: 3 });
    expect(lineRecord(entries, 'black', ['d4'])).toEqual({ positions: 0, seen: 0, missed: 0 });
  });
});
