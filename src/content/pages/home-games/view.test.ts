import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import type { RecentGame } from '#content/recent-games/games.ts';
import { homeGamesMarkup, playedSpeeds } from './view.ts';

const NOW = 1_792_614_257_022;

const game = (href: string, speed: string): RecentGame => ({
  href,
  board: { fen: '6k1/8/8/8/8/8/4P3/4K3 w - - 0 1', orientation: 'white', lastMove: [] },
  opponent: { name: 'Chlodowech', title: undefined, rating: 1508, aiLevel: undefined },
  outcome: 'win',
  ratingDiff: 7,
  speed,
  clock: { initial: 180, increment: 2 },
  daysPerTurn: undefined,
  playedAt: NOW - 60_000,
});

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => name } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('the home’s recent games', () => {
  it('offer a filter per speed played, fastest first, none for a single speed', () => {
    const games = [game('/game/a', 'rapid'), game('/game/b', 'bullet'), game('/game/c', 'rapid')];
    expect(playedSpeeds(games)).toEqual(['bullet', 'rapid']);
    expect(playedSpeeds([game('/game/a', 'blitz'), game('/game/b', 'blitz')])).toEqual([]);
  });

  it('start on every speed, in Lichess’s words for each', () => {
    setHtml(
      document.body,
      homeGamesMarkup([game('/game/a', 'rapid'), game('/game/b', 'bullet')], '/@/eresy/all', NOW),
    );
    const filters = queryAll(document, '.ln-ext-home-games__filters > button', HTMLButtonElement);
    expect(filters.map(button => button.textContent.trim())).toEqual([
      'recentGamesEvery',
      'speedBullet',
      'speedRapid',
    ]);
    expect(filters.map(button => button.classList.contains('active'))).toEqual([
      true,
      false,
      false,
    ]);
  });

  it('give each game a row that opens it and a button that analyses it', () => {
    setHtml(document.body, homeGamesMarkup([game('/game/a/black', 'blitz')], '/@/eresy/all', NOW));
    const row = queryOne(document, '.ln-ext-home-games__row', HTMLElement);
    const open = queryOne(
      document,
      '.ln-ext-home-games__row > .ln-ext-recent__game',
      HTMLAnchorElement,
    );
    const analyse = queryOne(document, '.ln-ext-home-games__analyse', HTMLAnchorElement);
    expect(row?.dataset.lnExtSpeed).toBe('blitz');
    expect(open?.getAttribute('href')).toBe('/game/a/black');
    expect(analyse?.getAttribute('href')).toBe('/game/a/black');
    expect(analyse?.getAttribute('aria-label')).toBe('recentGamesAnalyse');
    expect(queryOne(document, '.ln-ext-home-games__filters', HTMLElement)).toBeNull();
    expect(queryOne(document, '.ln-ext-recent__all', HTMLAnchorElement)?.getAttribute('href')).toBe(
      '/@/eresy/all',
    );
  });
});
