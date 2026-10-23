import { describe, expect, it } from 'vitest';
import { fakeApi, text } from '#page/review/fixtures/fake-api.ts';
import { writeMovetext } from './pgn-tree.ts';
import { angleOf, difficultyFor, fetchTraps, parseTraps, trapTree } from './traps.ts';

// Légal's mate: Black takes the queen, and mates in two.
const LEGAL = {
  game: { id: 'abcd1234', pgn: 'e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 Nxe5 Bxd1' },
  puzzle: {
    id: 'L3gal',
    rating: 1310,
    plays: 5000,
    solution: ['c4f7', 'e8e7', 'c3d5'],
    themes: ['mateIn2', 'opening'],
    initialPly: 9,
  },
};

const SHORT = {
  game: { pgn: 'e4 e5 Qh5 Nc6 Bc4 Nf6' },
  puzzle: { id: 'Sch0l', rating: 900, solution: ['h5f7'], themes: ['mateIn1'], initialPly: 5 },
};

const LATE = { ...LEGAL, puzzle: { ...LEGAL.puzzle, id: 'L4te', initialPly: 30 } };

const batch = (...puzzles: readonly unknown[]): string => JSON.stringify({ puzzles });

describe('parseTraps', () => {
  it('reads a puzzle’s game and its solution in SAN, the early ones only', () => {
    const traps = parseTraps(batch(LEGAL, LATE));
    expect(traps).toEqual([
      {
        id: 'L3gal',
        moves: ['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4', 'Nc3', 'g6', 'Nxe5', 'Bxd1'],
        solution: ['Bxf7+', 'Ke7', 'Nd5+'],
        themes: ['mateIn2', 'opening'],
        rating: 1310,
      },
    ]);
  });

  it('leaves out a game it can’t play, and reads nothing from another shape', () => {
    const broken = { ...LEGAL, game: { pgn: 'e4 e5 Ke3' } };
    expect(parseTraps(batch(broken))).toEqual([]);
    expect(parseTraps('{"puzzles":[{"id":1}]}')).toEqual([]);
    expect(parseTraps('<html>')).toEqual([]);
  });

  it('plays the game then the punishment as one line', () => {
    const [trap] = parseTraps(batch(SHORT));
    expect(trap && writeMovetext(trapTree(trap))).toBe('1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7+ *');
  });
});

describe('the puzzles asked for', () => {
  it('are of the difficulty nearest the user’s puzzle rating', () => {
    expect(difficultyFor(null)).toBe('normal');
    expect([800, 1250, 1500, 1700, 2400].map(difficultyFor)).toEqual([
      'easiest',
      'easier',
      'normal',
      'harder',
      'hardest',
    ]);
  });

  it('are of the opening’s family, named as Lichess’s angles', () => {
    expect(angleOf('Italian Game')).toBe('Italian_Game');
    expect(angleOf("King's Gambit")).toBe('Kings_Gambit');
    expect(angleOf('Grünfeld Defense')).toBe('Grunfeld_Defense');
    expect(angleOf('Caro-Kann Defense')).toBe('Caro-Kann_Defense');
    expect(angleOf('St. George Defense')).toBe('St_George_Defense');
  });
});

describe('fetchTraps', () => {
  // The batches are kept by address for the visit: each test asks for another opening's.
  it('asks for a batch once a visit, the shortest games first', async () => {
    const asked = fakeApi([[/^\/api\/puzzle\/batch\//, () => text(batch(LEGAL, SHORT))]]);
    const traps = await fetchTraps('Italian Game', { side: 'white', rating: 1850 });
    expect(traps.map(trap => trap.id)).toEqual(['Sch0l', 'L3gal']);
    expect(asked.map(request => request.url)).toEqual([
      '/api/puzzle/batch/Italian_Game?nb=50&color=white&difficulty=harder',
    ]);
    expect(await fetchTraps('Italian Game', { side: 'white', rating: 1850 })).toBe(traps);
    await fetchTraps('Italian Game', { side: 'black', rating: 1850 });
    expect(asked).toHaveLength(2);
  });

  it('fails on Lichess’s refusal, and asks again next time', async () => {
    const asked = fakeApi([[/batch/, () => text('Too many requests', 429)]]);
    await expect(fetchTraps('Ruy Lopez', { side: 'black', rating: null })).rejects.toThrow(
      'Puzzles: 429',
    );
    fakeApi([[/batch/, () => text(batch(LEGAL))]]);
    expect(await fetchTraps('Ruy Lopez', { side: 'black', rating: null })).toHaveLength(1);
    expect(asked).toHaveLength(1);
  });
});
