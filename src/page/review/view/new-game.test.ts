import { afterEach, describe, expect, it } from 'vitest';
import { Analysis } from '#page/lichess/analysis.ts';
import { fakeController } from '#page/review/fixtures/fake-lichess.ts';
import { newGameMarkup } from './new-game.ts';

afterEach(() => {
  delete document.body.dataset.user;
  document.documentElement.lang = '';
});

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// An analysed game's controller, its data as Lichess's has it.
function analysed(data: Record<string, unknown>): Analysis {
  const ctrl = fakeController({ id: 'abcd1234', positions: [{ ply: 0, fen: START }] });
  Object.assign(ctrl.data, data);
  return new Analysis(ctrl);
}

const markup = (analysis: Analysis): string => {
  const made = newGameMarkup(analysis, 'lr-ext-review__new');
  return made === '' ? '' : made.value;
};

describe('the review’s new game', () => {
  it('links to a game in the same pool, named by its time control', () => {
    document.body.dataset.user = 'eresy';
    const analysis = analysed({
      game: { id: 'abcd1234', source: 'pool', speed: 'bullet', variant: { key: 'standard' } },
      clock: { initial: 120, increment: 1 },
      opponent: { color: 'black', user: { id: 'bob' } },
    });
    expect(markup(analysis)).toBe(
      '<a class="lr-ext-review__new lr-ext-new-game" href="/#pool/2+1/bob">New 2+1</a>',
    );
  });

  // The time control stays whole where the label wraps.
  it('speaks French on a French page', () => {
    document.documentElement.lang = 'fr';
    const analysis = analysed({
      game: { id: 'abcd1234', source: 'friend', speed: 'rapid', variant: { key: 'standard' } },
      clock: { initial: 600, increment: 0 },
    });
    expect(markup(analysis)).toContain('href="/?hook_like=abcd1234">Nouvelle 10\u00a0min</a>');
  });

  it('is left out for a game without a clock', () => {
    const analysis = analysed({
      game: {
        id: 'abcd1234',
        source: 'friend',
        speed: 'correspondence',
        variant: { key: 'standard' },
      },
    });
    expect(markup(analysis)).toBe('');
  });
});
