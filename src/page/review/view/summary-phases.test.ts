import { describe, expect, it } from 'vitest';
import { COLORS } from '#shared/chess/types.ts';
import { queryAll } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { en } from '#page/review/i18n/en.ts';
import type { GameRating } from '#page/review/rating/rate-game.ts';
import { phasesMarkup, type PhasesInput } from './summary-phases.ts';

const RATING: GameRating = {
  white: {
    elo: 1850,
    phases: { opening: 'book', tactics: 'mistake', strategy: 'good', endgame: null },
  },
  black: {
    elo: 1620,
    phases: { opening: 'excellent', tactics: 'blunder', strategy: null, endgame: null },
  },
};

function rows(input: Partial<PhasesInput>): string[][] {
  const root = document.createElement('div');
  setHtml(root, phasesMarkup({ rating: null, language: en, order: COLORS, ...input }));
  return queryAll(root, '.ln-ext-sum-phase', HTMLElement).map(row =>
    [...row.children].map(cell => cell.textContent.trim()),
  );
}

describe('the summary’s phases', () => {
  it('give each side’s verdict per phase, in the cards’ order', () => {
    expect(rows({ rating: RATING })).toEqual([
      ['Opening?', 'Book', 'Excellent'],
      ['Tactical positions?', 'Mistake', 'Blunder'],
      ['Quiet positions?', 'Good', '—'],
    ]);
    expect(rows({ rating: RATING, order: ['black', 'white'] })[1]).toEqual([
      'Tactical positions?',
      'Blunder',
      'Mistake',
    ]);
  });

  it('show every phase as still to come until the game is rated', () => {
    expect(rows({})).toEqual([
      ['Opening?', '·', '·'],
      ['Tactical positions?', '·', '·'],
      ['Quiet positions?', '·', '·'],
      ['Endgame?', '·', '·'],
    ]);
  });
});
