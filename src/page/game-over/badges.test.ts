import { describe, expect, it } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { cellOf } from '#shared/chess/squares.ts';
import { badgesMarkup, kingBadges } from './badges.ts';
import { gameOverTexts } from './texts.ts';

const texts = gameOverTexts();

describe('kingBadges', () => {
  it('crowns the winner and says how the loser lost', () => {
    expect(kingBadges({ result: 'win', reason: 'time', winner: 'white' }, texts)).toEqual({
      white: { kind: 'win', icon: 'crown', label: 'Winner' },
      black: { kind: 'loss', icon: 'clock', label: 'Time out' },
    });
    expect(kingBadges({ result: 'loss', reason: 'mate', winner: 'black' }, texts).white).toEqual({
      kind: 'loss',
      icon: 'mate',
      label: 'Checkmate',
    });
  });

  it('gives both kings the draw, or the stalemate', () => {
    const draw = kingBadges({ result: 'draw', reason: 'draw', winner: null }, texts);
    expect(draw.white).toEqual({ kind: 'draw', icon: 'half', label: 'Draw' });
    expect(draw.black).toEqual(draw.white);
    const stalemate = kingBadges({ result: 'draw', reason: 'stalemate', winner: null }, texts);
    expect(stalemate.black.label).toBe('Stalemate');
  });
});

describe('cellOf', () => {
  it('counts from the board’s top-left corner, as the board is turned', () => {
    expect(cellOf('e1', 'white')).toEqual({ column: 4, row: 7 });
    expect(cellOf('e1', 'black')).toEqual({ column: 3, row: 0 });
    expect(cellOf('a8', 'white')).toEqual({ column: 0, row: 0 });
    expect(cellOf('a8', 'black')).toEqual({ column: 7, row: 7 });
  });
});

describe('badgesMarkup', () => {
  it('puts each king’s badge on its cell, the label kept on the board', () => {
    const badges = kingBadges({ result: 'win', reason: 'resign', winner: 'black' }, texts);
    const root = document.createElement('div');
    setHtml(
      root,
      badgesMarkup(badges, { white: { column: 0, row: 7 }, black: { column: 4, row: 0 } }),
    );
    const [white, black] = queryAll(root, '.ln-ext-end__king', HTMLElement);
    expect(white?.className).toBe(
      'ln-ext-end__king ln-ext-end__king--loss ln-ext-end__king--start',
    );
    expect(white?.getAttribute('style')).toBe('--column:0;--row:7');
    expect(white?.textContent.trim()).toBe('Resigned');
    expect(black?.className).toBe('ln-ext-end__king ln-ext-end__king--win ln-ext-end__king--below');
    expect(black?.querySelector('.ln-ext-end__king-icon svg')).not.toBeNull();
  });

  it('leaves out a king it can’t find', () => {
    const badges = kingBadges({ result: 'draw', reason: 'draw', winner: null }, texts);
    const root = document.createElement('div');
    setHtml(root, badgesMarkup(badges, { white: { column: 7, row: 3 } }));
    expect(queryAll(root, '.ln-ext-end__king', HTMLElement).map(king => king.className)).toEqual([
      'ln-ext-end__king ln-ext-end__king--draw ln-ext-end__king--end',
    ]);
  });
});
