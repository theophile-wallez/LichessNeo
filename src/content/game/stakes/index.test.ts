import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Color } from '#shared/chess/types.ts';
import { queryAll } from '#shared/dom.ts';
import { createStakesSync, stakesMarkup } from './index.ts';
import type { RatedGame } from './round.ts';

const settings = vi.hoisted(() => ({ ratingStakes: true }));

vi.mock('#content/settings/settings.ts', () => ({ currentSettings: () => settings }));

const TEXTS = { win: 'Victoire', draw: 'Nulle', loss: 'Défaite' };

const game = (own: Color | null): RatedGame => ({
  id: 'n9ZaJJDr',
  perf: 'classical',
  variant: 'standard',
  players: {
    white: { user: 'mrbadbeat', glicko: { rating: 2372.04, deviation: 70.54 }, bot: false },
    black: { user: 'trrak55', glicko: { rating: 2230.42, deviation: 45 }, bot: false },
  },
  own,
});

function page(orientation: Color, over = false): void {
  document.body.innerHTML = `<main class="round"><div class="round__app">
    <div class="round__app__board"><div class="cg-wrap orientation-${orientation}"></div></div>
    ${over ? '<div class="result-wrap"></div>' : ''}
  </div></main>`;
}

const pill = (side: string): HTMLElement | null =>
  document.querySelector(`.ln-ext-stakes--${side}`);
const shown = (side: string): string | null =>
  pill(side)?.hasAttribute('hidden') === false ? (pill(side)?.textContent ?? null) : null;

beforeEach(() => {
  settings.ratingStakes = true;
  history.replaceState(null, '', '/game/n9ZaJJDr');
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('stakesMarkup', () => {
  it('signs each outcome, with a true minus and ±0, and names it', () => {
    const element = document.createElement('div');
    element.innerHTML = String(stakesMarkup({ win: 7, draw: 0, loss: -12 }, TEXTS));
    const outcomes = queryAll(element, '.ln-ext-stakes__outcome', HTMLElement);
    expect(outcomes.map(outcome => outcome.textContent)).toEqual(['+7', '±0', '−12']);
    expect(outcomes.map(outcome => outcome.dataset.lnExtTip)).toEqual([
      'Victoire',
      'Nulle',
      'Défaite',
    ]);
  });
});

describe('the stakes in the bars', () => {
  it("shows a watcher both players' stakes, each in its bar", () => {
    page('white');
    createStakesSync(game(null), TEXTS)();
    expect(shown('bottom')).toBe('+8−6−20');
    expect(shown('top')).toBe('+8+2−3');
  });

  it('follows the board when it is flipped', () => {
    const sync = createStakesSync(game(null), TEXTS);
    page('white');
    sync();
    const board = document.querySelector('.cg-wrap');
    board?.classList.replace('orientation-white', 'orientation-black');
    sync();
    expect(shown('bottom')).toBe('+8+2−3');
    expect(shown('top')).toBe('+8−6−20');
  });

  it("shows a player only their own stakes, whichever side they're on", () => {
    page('black');
    createStakesSync(game('white'), TEXTS)();
    expect(shown('top')).toBe('+8−6−20');
    expect(shown('bottom')).toBeNull();
  });

  it('goes once the game is over', () => {
    page('white', true);
    createStakesSync(game(null), TEXTS)();
    expect(shown('top')).toBeNull();
    expect(shown('bottom')).toBeNull();
  });

  it('goes when the settings turn it off, and comes back', () => {
    const sync = createStakesSync(game(null), TEXTS);
    page('white');
    settings.ratingStakes = false;
    sync();
    expect(shown('bottom')).toBeNull();
    settings.ratingStakes = true;
    sync();
    expect(shown('bottom')).toBe('+8−6−20');
  });

  it('draws nothing on another game, as TV swaps them without a reload', () => {
    history.replaceState(null, '', '/game/abcdefgh');
    page('white');
    createStakesSync(game(null), TEXTS)();
    expect(pill('bottom')).toBeNull();
  });
});
