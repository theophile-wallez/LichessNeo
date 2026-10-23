import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { BOARD_STATE } from '#content/puzzle-dashboard/fixtures/history.ts';
import { parseBoardState } from './board.ts';
import { coachWord, type Week } from './coach-word.ts';
import type { Round } from './read.ts';
import { heroMarkup, REPLAY_HREF, SHELF_SIZE, shelfMarkup } from './view.ts';

// Each message as its name, then what fills it in.
const getMessage = (name: string, substitutions: readonly string[] = []): string =>
  [name, ...substitutions].join(':');

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

const NOW = new Date(2026, 9, 12, 12);

function hero(week: Week, coachId: number | null = 3): HTMLElement {
  setHtml(document.body, heroMarkup(week, coachWord(week, null, NOW), coachId));
  const section = queryOne(document, '.ln-ext-phist__hero', HTMLElement);
  if (!section) throw new Error('no hero');
  return section;
}

// Each link's words and where it leads.
const links = (root: ParentNode): string[] =>
  queryAll(root, 'a', HTMLAnchorElement).map(
    link => `${link.textContent.trim()} ${link.getAttribute('href')}`,
  );

describe('the week over the history', () => {
  it('shows the puzzles solved first try on a track, in the week’s color, and its coach', () => {
    const section = hero({ puzzles: 8, firstWins: 6, toReplay: 2 });
    expect(section.dataset.lnExtTier).toBe('up');
    expect(section.querySelector('.ln-ext-phist__big')?.textContent.replace(/\s+/g, ' ')).toBe(
      ' 6 phistSolved:8 ',
    );
    const track = queryOne(section, '.ln-ext-phist__track', HTMLElement);
    expect(track?.style.getPropertyValue('--ln-ext-phist-p')).toBe('0.750');
    expect(section.querySelector('p')?.textContent).toBe('phistSharp phistMissedMany:2');
    const mascot = queryOne(section, '.ln-ext-pdash__mascot', HTMLElement);
    expect(mascot?.dataset.lnExtAvatarCoach).toBe('3');
  });

  it('has no mascot with no coach', () => {
    const section = hero({ puzzles: 8, firstWins: 6, toReplay: 2 }, null);
    expect(queryOne(section, '.ln-ext-pdash__mascot', HTMLElement)).toBeNull();
    expect(section.querySelector('p')?.textContent).toBe('phistSharp phistMissedMany:2');
  });

  it('leads to the week’s replay while some are left, else to more puzzles', () => {
    expect(links(hero({ puzzles: 8, firstWins: 6, toReplay: 2 }))).toEqual([
      `phistRetryMany:2 ${REPLAY_HREF}`,
      'phistKeepGoing /training',
    ]);
    expect(links(hero({ puzzles: 8, firstWins: 7, toReplay: 1 }))[0]).toBe(
      `phistRetryOne ${REPLAY_HREF}`,
    );
    expect(links(hero({ puzzles: 8, firstWins: 8, toReplay: 0 }))).toEqual([
      'phistKeepGoing /training',
    ]);
    expect(links(hero({ puzzles: 0, firstWins: 0, toReplay: 0 }))).toEqual([
      'phistStart /training',
    ]);
  });
});

const round = (index: number, state = BOARD_STATE): Round => ({
  href: `/training/p${index}`,
  solved: false,
  board: parseBoardState(state),
});

describe('the puzzles to retry', () => {
  it('are a board each, linked to its puzzle, the first few only', () => {
    const rounds = Array.from({ length: SHELF_SIZE + 3 }, (_, index) => round(index));
    setHtml(document.body, shelfMarkup(rounds));
    const redos = queryAll(document, '.ln-ext-phist__redo', HTMLAnchorElement);
    expect(redos).toHaveLength(SHELF_SIZE);
    expect(redos[0]?.getAttribute('href')).toBe('/training/p0');
    expect(redos[0]?.querySelectorAll('piece')).toHaveLength(3);
  });

  it('leave out a puzzle whose board can’t be read', () => {
    setHtml(document.body, shelfMarkup([round(0, 'x'), round(1)]));
    expect(links(document).map(link => link.split(' ')[1])).toEqual(['/training/p1']);
  });
});
