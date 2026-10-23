import { beforeEach, describe, expect, it } from 'vitest';
import { cardsOf } from './rounds.ts';
import { keepSettings, readSettings } from './settings.ts';
import { freshSetup } from './setup.ts';

beforeEach(() => {
  localStorage.clear();
});

describe('freshSetup', () => {
  it('opens on the home page, as White, with the settings kept', () => {
    keepSettings({ ...readSettings(), lines: 'all', goal: 40 });
    const setup = freshSetup();
    expect(setup).toMatchObject({
      side: 'white',
      query: '',
      results: null,
      view: 'home',
      tab: 'mine',
      pruning: null,
      games: { state: 'idle' },
      studies: { state: 'idle' },
      quiz: null,
    });
    expect(setup.settings).toMatchObject({ lines: 'all', goal: 40 });
  });

  it('starts each page’s own state anew', () => {
    const first = freshSetup();
    first.unfolded.add('e4');
    expect(freshSetup().unfolded.size).toBe(0);
  });
});

describe('cardsOf', () => {
  it('starts a round on its first card, over at once with none', () => {
    expect(cardsOf(['a', 'b'])).toEqual({
      cards: ['a', 'b'],
      index: 0,
      played: 0,
      clean: 0,
      over: false,
    });
    expect(cardsOf([]).over).toBe(true);
  });
});
