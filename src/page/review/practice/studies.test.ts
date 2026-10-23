import { describe, expect, it } from 'vitest';
import { fakeApi, text } from '#page/review/fixtures/fake-api.ts';
import { writeMovetext } from './pgn-tree.ts';
import { chaptersOf, studyChapters } from './studies.ts';

const chapter = (tags: Readonly<Record<string, string>>, movetext: string): string =>
  [...Object.entries(tags).map(([name, value]) => `[${name} "${value}"]`), '', movetext].join('\n');

const STUDY = [
  chapter(
    {
      Event: 'My openings: Italian',
      ChapterName: 'Italian',
      ChapterURL: 'https://lichess.org/study/abcd1234/chap0001',
      Orientation: 'white',
    },
    '1. e4 e5 2. Nf3 (2. Bc4) 2... Nc6 *',
  ),
  chapter(
    {
      Event: 'Caro-Kann',
      ChapterURL: 'https://lichess.org/study/abcd1234/chap0002',
      Orientation: 'black',
    },
    '1. e4 c6 *',
  ),
  chapter(
    {
      ChapterName: 'An endgame',
      FEN: '8/8/8/4k3/8/8/4P3/4K3 w - - 0 1',
      ChapterURL: 'https://lichess.org/study/abcd1234/chap0003',
    },
    '1. Kd2 *',
  ),
  chapter({ ChapterName: 'Empty', ChapterURL: 'https://lichess.org/study/abcd1234/chap0004' }, '*'),
  chapter(
    {
      ChapterName: 'From the start',
      FEN: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    },
    '1. d4 *',
  ),
].join('\n\n');

describe('studyChapters', () => {
  it('reads the chapters from the standard start that have moves', () => {
    const chapters = studyChapters(STUDY);
    expect(chapters.map(({ id, name, side, moves }) => ({ id, name, side, moves }))).toEqual([
      { id: 'chap0001', name: 'Italian', side: 'white', moves: 5 },
      { id: 'chap0002', name: 'Caro-Kann', side: 'black', moves: 2 },
      { id: '', name: 'From the start', side: 'white', moves: 1 },
    ]);
    expect(writeMovetext(chapters[0]?.tree ?? { comment: '', children: [] })).toBe(
      '1. e4 e5 2. Nf3 (2. Bc4) 2... Nc6 *',
    );
  });
});

describe('chaptersOf', () => {
  it('reads a study once a visit', async () => {
    const asked = fakeApi([[/^\/study\/once0001\.pgn/, () => text(STUDY)]]);
    const first = await chaptersOf('once0001');
    expect(first).toHaveLength(3);
    expect(await chaptersOf('once0001')).toBe(first);
    expect(asked).toHaveLength(1);
  });

  it('asks again after a failure', async () => {
    const asked = fakeApi([[/^\/study\/fail0001\.pgn/, () => text('', 500)]]);
    await expect(chaptersOf('fail0001')).rejects.toThrow('Study export: 500');
    fakeApi([[/^\/study\/fail0001\.pgn/, () => text(STUDY)]]);
    expect(await chaptersOf('fail0001')).toHaveLength(3);
    expect(asked).toHaveLength(1);
  });
});
