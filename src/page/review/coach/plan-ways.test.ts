import { describe, expect, it } from 'vitest';
import { en } from '#page/review/i18n/en.ts';
import { planWays } from './plan-ways.ts';

// Each plan said in its own sentences, with what it carries.

const KNIGHT = { role: 'knight', color: 'black' } as const;
const BISHOP = { role: 'bishop', color: 'white' } as const;
const facts = en.facts;

describe('planWays', () => {
  it('says a plan that carries nothing as it is', () => {
    expect(planWays({ kind: 'luft' }, facts)).toEqual(facts.luft);
    expect(planWays({ kind: 'philidor' }, facts)).toEqual(facts.philidor);
  });

  it('says an ending’s, a line’s and a square’s plan with what they carry', () => {
    expect(planWays({ kind: 'passedPawn', made: true, trait: 'outside' }, facts)).toEqual(
      facts.passedPawn(true, 'outside'),
    );
    expect(
      planWays({ kind: 'opensLine', slider: BISHOP, from: 'b2', line: 'diagonal' }, facts),
    ).toEqual(facts.opensLine(BISHOP, 'diagonal'));
    expect(planWays({ kind: 'cutsOff', file: 'd' }, facts)).toEqual(facts.cutsOff('d'));
    expect(planWays({ kind: 'pawnBreak', square: 'd4', base: true, king: 'e1' }, facts)).toEqual(
      facts.pawnBreak('d4', true, 'e1'),
    );
  });

  it('says a piece chased with nowhere to go as trapped', () => {
    expect(planWays({ kind: 'chases', piece: KNIGHT, trapped: true }, facts)).toEqual(
      facts.traps(KNIGHT, null),
    );
    expect(planWays({ kind: 'chases', piece: KNIGHT }, facts)).toEqual(facts.chases(KNIGHT, null));
  });

  it('says a pawn attacked, outnumbered or not', () => {
    const pawn = { role: 'pawn', color: 'black' } as const;
    expect(
      planWays({ kind: 'attacksPawn', piece: pawn, square: 'c6', outnumbered: true }, facts),
    ).toEqual(facts.attacksPawn(pawn, 'c6', true));
    expect(planWays({ kind: 'attacksPawn', piece: pawn, square: 'c6' }, facts)).toEqual(
      facts.attacksPawn(pawn, 'c6', false),
    );
  });

  it('says a pin with the piece behind, and a piece’s plan with the piece', () => {
    const king = { role: 'king', color: 'black' } as const;
    expect(planWays({ kind: 'pins', piece: KNIGHT, behind: king }, facts)).toEqual(
      facts.pins(KNIGHT, king),
    );
    expect(planWays({ kind: 'outpost', piece: BISHOP }, facts)).toEqual(facts.outpost(BISHOP));
  });
});
