import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import type { RecentGame } from './games.ts';
import { recentGamesMarkup } from './view.ts';

const NOW = Date.UTC(2026, 9, 27, 20);

const GAME: RecentGame = {
  href: '/game/aDN8u0zd/black',
  board: { fen: '6k1/8/8/8/8/8/4P3/4K3 w - - 0 1', orientation: 'black', lastMove: ['e1', 'e2'] },
  opponent: { name: 'Chlodowech', title: 'FM', rating: 1508, aiLevel: undefined },
  outcome: 'win',
  ratingDiff: 7,
  speed: 'bullet',
  clock: { initial: 120, increment: 1 },
  daysPerTurn: undefined,
  playedAt: NOW - 22 * 60_000,
};

// Each message as its name, then what fills it in.
const getMessage = (name: string, substitutions: readonly string[] = []): string =>
  [name, ...substitutions].join(':');

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage } });
  document.documentElement.lang = 'en';
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

function drawn(games: readonly RecentGame[]): HTMLElement[] {
  setHtml(document.body, recentGamesMarkup(games, '/@/Eresy/all', NOW));
  return queryAll(document, '.ln-ext-recent__game', HTMLElement);
}

const text = (card: HTMLElement | undefined, selector: string): string | undefined =>
  card && queryOne(card, selector, HTMLElement)?.textContent.trim();

describe('the recent games’ cards', () => {
  it('show the opponent, the outcome with its change, the time control and when', () => {
    const [card] = drawn([GAME]);
    expect(card?.getAttribute('href')).toBe('/game/aDN8u0zd/black');
    expect(card?.dataset.lnExtOutcome).toBe('win');
    expect(text(card, '.utitle')).toBe('FM');
    expect(text(card, '.ln-ext-recent__name')).toBe('Chlodowech');
    expect(text(card, '.ln-ext-recent__rating')).toBe('1508');
    expect(text(card, '.ln-ext-recent__outcome')).toBe('recentGamesWin');
    expect(text(card, '.ln-ext-recent__diff')).toBe('+7');
    expect(card && queryOne(card, '.ln-ext-recent__speed', HTMLElement)?.dataset.icon).toBe(
      '\ue032',
    );
    expect(text(card, '.ln-ext-recent__meta')).toMatch(/^2\+1\s+22 min\. ago$/);
    expect(
      card && queryOne(card, '.ln-ext-still-board.orientation-black', HTMLElement),
    ).toBeTruthy();
  });

  it('name Stockfish by its level, and leave out a casual game’s change and a missing rating', () => {
    const [card] = drawn([
      {
        ...GAME,
        opponent: { name: undefined, title: undefined, rating: undefined, aiLevel: 5 },
        outcome: 'loss',
        ratingDiff: undefined,
      },
    ]);
    expect(text(card, '.ln-ext-recent__name')).toBe('recentGamesStockfish:5');
    expect(text(card, '.ln-ext-recent__outcome')).toBe('recentGamesLoss');
    expect(card && queryOne(card, '.ln-ext-recent__diff', HTMLElement)).toBeNull();
    expect(card && queryOne(card, '.ln-ext-recent__rating', HTMLElement)).toBeNull();
  });

  it('call an opponent without an account anonymous, and write a correspondence game’s days', () => {
    const [card] = drawn([
      {
        ...GAME,
        opponent: { name: undefined, title: undefined, rating: undefined, aiLevel: undefined },
        clock: undefined,
        daysPerTurn: 3,
        speed: 'correspondence',
      },
    ]);
    expect(text(card, '.ln-ext-recent__name')).toBe('recentGamesAnonymous');
    expect(text(card, '.ln-ext-recent__meta')).toMatch(/^3 days\s/);
  });

  it('lead to the profile’s full list', () => {
    drawn([GAME, GAME]);
    expect(queryAll(document, '.ln-ext-recent__game', HTMLElement)).toHaveLength(2);
    expect(queryOne(document, '.ln-ext-recent__all', HTMLAnchorElement)?.getAttribute('href')).toBe(
      '/@/Eresy/all',
    );
  });
});
