import { describe, expect, it } from 'vitest';
import { positionKey, studyPositions } from './study.ts';

const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const AFTER_E4_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const AFTER_F6 = 'rnbqkbnr/ppppp1pp/5p2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
// 1. e4 Nf6 2. Nf3 and 1. Nf3 Nf6 2. e4 reach it alike.
const ALEKHINE_NF3 = 'rnbqkb1r/pppppppp/5n2/8/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 2 2';

const chapter = (name: string, movetext: string): string => `[Event "${name}"]\n\n${movetext}`;

describe('studyPositions', () => {
  it('keys each commented position by its pieces and side to move, with its moves on', () => {
    const positions = studyPositions(
      chapter(
        'First moves',
        '1. e4 { The king’s pawn. } 1... e5 ( 1... c5 ) ( 1... f6 $2 { Weak. } ) *',
      ),
    );
    const e4 = positions.get(positionKey(AFTER_E4));
    expect(e4?.comment).toBe('The king’s pawn.');
    expect(e4?.mistake).toBe(false);
    expect(e4?.line.map(move => move.san)).toEqual(['e4']);
    // A mistake played there isn't a move theory goes on with.
    expect(e4?.next.map(move => `${move.san} ${move.uci} ${move.color}`)).toEqual([
      'e5 e7e5 black',
      'c5 c7c5 black',
    ]);
    expect(positions.get(positionKey(AFTER_F6))?.mistake).toBe(true);
    expect(positions.has(positionKey(AFTER_E4_E5))).toBe(false);
  });

  it('reads a mistake from the glyph on its move too', () => {
    const positions = studyPositions(chapter('First moves', '1. e4 e5 ( 1... f6? { Weak. } ) *'));
    expect(positions.get(positionKey(AFTER_F6))?.mistake).toBe(true);
  });

  it('finds a position its chapters reach by another move order', () => {
    const positions = studyPositions(
      [
        chapter('Alekhine', '1. e4 Nf6 2. Nf3 { Black takes on e4? Not yet. } 2... d6 *'),
        chapter('Réti', '1. Nf3 Nf6 2. e4 { The same position. } 2... Nxe4 *'),
      ].join('\n\n'),
    );
    const position = positions.get(positionKey(ALEKHINE_NF3));
    expect(position?.comment).toBe('Black takes on e4? Not yet.');
    expect(position?.line.map(move => move.san)).toEqual(['e4', 'Nf6', 'Nf3']);
  });

  it('keeps theory’s own comment over a mistake that transposes into it', () => {
    const positions = studyPositions(
      [
        chapter('Alekhine', '1. e4 Nf6 2. Nc3 ( 2. Nf3?! { Hangs e4. } 2... Nxe4 ) *'),
        chapter('Réti', '1. Nf3 Nf6 2. e4 { The Lemberger idea. } 2... Nxe4 *'),
      ].join('\n\n'),
    );
    const position = positions.get(positionKey(ALEKHINE_NF3));
    expect(position?.comment).toBe('The Lemberger idea.');
    expect(position?.mistake).toBe(false);
  });

  it('keeps theory’s own comment over a mistake that comes after it', () => {
    const positions = studyPositions(
      [
        chapter('Réti', '1. Nf3 Nf6 2. e4 { The Lemberger idea. } 2... Nxe4 *'),
        chapter('Alekhine', '1. e4 Nf6 2. Nc3 ( 2. Nf3?! { Hangs e4. } 2... Nxe4 ) *'),
      ].join('\n\n'),
    );
    expect(positions.get(positionKey(ALEKHINE_NF3))?.comment).toBe('The Lemberger idea.');
  });

  it('draws a comment’s shapes, out of its text', () => {
    const positions = studyPositions(
      chapter('First moves', '1. e4 { The centre. [%csl Gd5][%cal Ge2e4] } *'),
    );
    const e4 = positions.get(positionKey(AFTER_E4));
    expect(e4?.comment).toBe('The centre.');
    expect(e4?.marks).toEqual([
      { kind: 'ring', square: 'd5', tone: 'defense' },
      { kind: 'link', from: 'e2', to: 'e4', tone: 'defense' },
    ]);
  });

  it('takes no position whose comment is only shapes', () => {
    const positions = studyPositions(chapter('First moves', '1. e4 { [%csl Gd5] } *'));
    expect(positions.size).toBe(0);
  });

  it('skips a move that can’t be played, and all after it', () => {
    const positions = studyPositions(chapter('Typo', '1. e5 { Nonsense. } 1... e6 { Never. } *'));
    expect(positions.size).toBe(0);
  });
});
