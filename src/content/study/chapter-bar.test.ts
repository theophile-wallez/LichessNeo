import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { startSyncLoop } from '#content/sync-loop.ts';
import { studyChapterBar } from './chapter-bar.ts';
import { studyMarkup } from './fixtures.ts';

// happy-dom lays nothing out: the sheet's scrolling to its chapter is left alone.
vi.mock(import('#shared/dom.ts'), async importOriginal => ({
  ...(await importOriginal()),
  centerInScroller: vi.fn<(element: HTMLElement) => void>(),
}));

const TICK_MS = 250;

const getMessage = (name: string, substitutions: readonly string[] = []): string =>
  [name, ...substitutions].join(' ');

beforeAll(() => {
  vi.useFakeTimers();
  studyChapterBar.start();
  startSyncLoop();
});

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage } });
});

const page = (): HTMLElement | null => queryOne(document, 'main', HTMLElement);
const bar = (part: string): HTMLElement | null =>
  queryOne(document, `.ln-ext-study-bar__${part}`, HTMLElement);

function show(markup: string): void {
  document.body.innerHTML = markup;
  vi.advanceTimersByTime(TICK_MS);
}

describe('a study’s chapter bar', () => {
  it('names the chapter on the board and how far it is in the study', () => {
    show(studyMarkup({ active: 1 }));
    expect(bar('number')?.textContent).toBe('2');
    expect(bar('kicker')?.textContent).toBe('studyChapterOf 2 3');
    expect(bar('title')?.textContent).toBe('Main line');
    expect(bar('progress')?.style.getPropertyValue('--ln-ext-progress')).toBe(String(2 / 3));
  });

  it('steps to the chapters beside it through Lichess’s list', () => {
    show(studyMarkup({ active: 0 }));
    const picked: string[] = [];
    for (const button of queryAll(document, '.study-list > button', HTMLElement))
      button.addEventListener('click', () => picked.push(button.textContent));
    const previous = queryOne(document, '.ln-ext-study-bar__step--previous', HTMLButtonElement);
    const next = queryOne(document, '.ln-ext-study-bar__step--next', HTMLButtonElement);
    expect(previous?.disabled).toBe(true);
    next?.click();
    expect(picked).toEqual(['Main line']);
  });

  it('opens the contents from its title, and closes them on a pick or Escape', () => {
    show(studyMarkup());
    bar('words')?.click();
    expect(page()?.dataset.lnExtContents).toBe('');
    expect(bar('words')?.getAttribute('aria-expanded')).toBe('true');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(page()?.dataset.lnExtContents).toBeUndefined();
    bar('words')?.click();
    queryAll(document, '.study-list > button', HTMLElement)[2]?.click();
    expect(page()?.dataset.lnExtContents).toBeUndefined();
  });

  it('closes the contents from the shade over the board', () => {
    show(studyMarkup());
    bar('words')?.click();
    queryOne(document, '.ln-ext-study-backdrop', HTMLElement)?.click();
    expect(page()?.dataset.lnExtContents).toBeUndefined();
  });

  it('keeps the player bars of a game, not the names split out of an introduction', () => {
    show(studyMarkup({ players: ['Kasparov', 'Anand'], result: true }));
    expect(page()?.dataset.lnExtPlayers).toBe('');
    show(studyMarkup({ players: ['Introduction', ''] }));
    expect(page()?.dataset.lnExtPlayers).toBeUndefined();
  });
});
