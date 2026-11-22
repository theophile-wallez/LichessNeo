import { describe, expect, it } from 'vitest';
import { formatEval } from '#page/review/evaluation/format.ts';
import { en } from '#page/review/i18n/en.ts';
import { commentOn, moves } from './review.ts';

// The review lichess.org's analysis board gives the Opera Game, with the
// extension: what the demo must show (scripts/site/record-demo.ts).

const move = (ply: number) => {
  const found = moves[ply - 1];
  if (!found) throw new Error(`no move at ply ${ply}`);
  return found;
};

const plainText = (ply: number): string =>
  commentOn(move(ply), 1, en)
    .parts.map(part => part.text)
    .join(' ')
    .replaceAll(/\[\[[a-z]:[a-z]+:?([^\]@]*)[^\]]*\]\]/g, '$1');

describe('the demo’s review', () => {
  it('judges the moves as the extension does', () => {
    const marked = moves
      .filter(played => !['book', 'best', 'excellent', 'good'].includes(played.moveClass))
      .map(played => `${played.ply} ${played.san} ${played.moveClass}`);
    expect(marked).toEqual([
      '12 Nf6 inaccuracy',
      '15 Nc3 inaccuracy',
      '18 b5 inaccuracy',
      '19 Nxb5 brilliant',
      '20 cxb5 inaccuracy',
      '25 Rxd7 brilliant',
      '27 Rd1 great',
      '30 Nxd7 inaccuracy',
    ]);
  });

  it('keeps the book up to 4.dxe5, as the masters play it', () => {
    expect(moves.findLast(played => played.moveClass === 'book')?.ply).toBe(7);
  });

  it('scores and comments on 10.Nxb5 as the extension does', () => {
    expect(formatEval(move(19).after)).toBe('+4.22');
    expect(plainText(19)).toBe(
      'The knight goes for the pawn on purpose: taking it back would cost Black dearly.',
    );
  });
});
