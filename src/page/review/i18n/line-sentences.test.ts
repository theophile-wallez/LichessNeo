import { describe, expect, it } from 'vitest';
import type { Piece } from '#shared/chess/index.ts';
import { en, english } from './en.ts';
import { fr, french } from './fr.ts';

// The coach's sentences on what a line wins, the tactic that wins it, and a
// quiet move's plan, in both languages.

const black = (role: Piece['role']): Piece => ({ role, color: 'black' });
const white = (role: Piece['role']): Piece => ({ role, color: 'white' });

describe('the material won', () => {
  it('names pieces of up to two kinds, and what they cost', () => {
    const cases = [
      { won: [black('knight')], lost: [] },
      { won: [black('pawn'), black('pawn')], lost: [] },
      { won: [black('rook'), black('pawn')], lost: [] },
      { won: [black('queen')], lost: [white('rook')] },
      { won: [black('rook')], lost: [white('bishop')] },
    ];
    expect(cases.map(en.facts.material)).toEqual([
      'a [[p:bn]]knight',
      'two [[p:bp]]pawns',
      'a [[p:br]]rook and a [[p:bp]]pawn',
      'a [[p:bq]]queen for a [[p:wr]]rook',
      'the exchange',
    ]);
    expect(cases.map(fr.facts.material)).toEqual([
      'un [[p:bn]]cavalier',
      'deux [[p:bp]]pions',
      'une [[p:br]]tour et un [[p:bp]]pion',
      'une [[p:bq]]dame contre une [[p:wr]]tour',
      'la qualité',
    ]);
  });

  it('says nothing of three kinds of pieces', () => {
    const won = [black('rook'), black('knight'), black('pawn')];
    expect(en.facts.material({ won, lost: [] })).toBeNull();
    expect(fr.facts.material({ won, lost: [] })).toBeNull();
  });
});

describe('the tactic', () => {
  const MOVE = '16. [[m:w:Qc7+]]';

  it('names a fork, two of a kind counted', () => {
    expect(en.facts.motif('fork', MOVE, [black('king'), black('rook')])).toBe(
      `${MOVE} forks the [[p:bk]]king and the [[p:br]]rook.`,
    );
    expect(en.facts.motif('fork', MOVE, [black('rook'), black('rook')])).toBe(
      `${MOVE} forks two [[p:br]]rooks.`,
    );
    expect(fr.facts.motif('fork', MOVE, [black('rook'), black('rook')])).toBe(
      `${MOVE} fait une fourchette sur deux [[p:br]]tours.`,
    );
  });

  it('says what a pinned piece is pinned to, agreed in French', () => {
    expect(en.facts.motif('pin', MOVE, [black('queen'), black('king')])).toBe(
      'The [[p:bq]]queen is pinned to the [[p:bk]]king.',
    );
    expect(fr.facts.motif('pin', MOVE, [black('queen'), black('king')])).toBe(
      'La [[p:bq]]dame est clouée au [[p:bk]]roi.',
    );
  });

  it('speaks of the viewer’s own pieces as theirs', () => {
    expect(english('black').facts.motif('trappedPiece', MOVE, [black('bishop')])).toBe(
      'Your [[p:bb]]bishop is trapped: it has nowhere to go.',
    );
    expect(french('black').facts.motif('trappedPiece', MOVE, [black('bishop')])).toBe(
      'Ton [[p:bb]]fou est pris au piège : il n’a plus de case.',
    );
  });

  it('needs the piece a check wins to name it', () => {
    expect(en.facts.motif('doubleCheck', MOVE, [black('king')])).toBeNull();
    expect(fr.facts.motif('discoveredCheck', MOVE, [black('king')])).toBeNull();
  });
});

describe('a quiet move’s plan', () => {
  it('is said in both languages', () => {
    expect(en.facts.develops(white('knight'))).toContain('The [[p:wn]]knight comes into play.');
    expect(fr.facts.develops(white('knight'))).toContain('Le [[p:wn]]cavalier entre en jeu.');
    expect(en.facts.openFile(true)).toContain(
      'The rook takes the half-open file, where it belongs.',
    );
    expect(fr.facts.passedPawn(true)).toContain('Un pion passé est né.');
  });
});

describe('a line’s gain', () => {
  const LINE = '13. [[m:w:Qe4]] [[m:b:g6]] 14. [[m:w:Qxa8]]';

  it('says who wins what after the line', () => {
    const gain = { material: 'a rook', line: LINE, moves: 2 };
    expect(en.facts.losesMaterial('white', gain, false)[0]).toBe(
      `White wins a rook in two moves: ${LINE}.`,
    );
    expect(en.facts.losesMaterial('white', { ...gain, moves: 1 }, false)[0]).toBe(
      `White wins a rook on the next move: ${LINE}.`,
    );
    expect(en.facts.winsAlong({ ...gain, moves: 1 })[0]).toBe(
      `This wins a rook right away: ${LINE}.`,
    );
    expect(fr.facts.winsAlong({ ...gain, material: 'une tour', moves: 1 })[0]).toBe(
      `De quoi gagner une tour tout de suite : ${LINE}.`,
    );
    expect(fr.facts.wouldHaveWon('black', { ...gain, material: 'une tour' })[0]).toBe(
      `Le mieux était de gagner une tour en deux coups : ${LINE}.`,
    );
  });
});
