import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import type * as Choices from './choices.ts';
import type * as LibraryModule from './library.ts';
import type * as SavedBoards from './saved-boards.ts';

// The saved boards are cached in their module: each test imports fresh copies.
async function load(): Promise<typeof Choices & typeof LibraryModule & typeof SavedBoards> {
  return {
    ...(await import('./choices.ts')),
    ...(await import('./library.ts')),
    ...(await import('./saved-boards.ts')),
  };
}

async function boardSection(): Promise<HTMLElement> {
  const { choiceSection, createLibrary } = await load();
  const library = createLibrary({
    readPicked: () => Promise.resolve([]),
    readAll: () => Promise.resolve([]),
    save: () => Promise.resolve(),
    erase: () => Promise.resolve(),
    show: () => undefined,
  });
  return choiceSection('board', library);
}

function thumb(section: HTMLElement, id: string): HTMLElement {
  const found = queryOne(section, `[data-ln-ext-choice="${id}"] .ln-ext-src-thumb`, HTMLElement);
  if (!found) throw new Error(`no ${id}`);
  return found;
}

const squares = (element: HTMLElement): (string | undefined)[] => [
  element.dataset.lnExtSquares,
  element.style.getPropertyValue('--ln-ext-thumb-light'),
  element.style.getPropertyValue('--ln-ext-thumb-dark'),
];

beforeEach(() => {
  vi.resetModules();
  document.body.dataset.user = 'ann';
});

afterEach(() => {
  localStorage.clear();
  delete document.body.dataset.user;
});

describe('the board panel’s tiles', () => {
  it('show a two-tone board’s squares, and leave the others to their stylesheet', async () => {
    const section = await boardSection();
    expect(squares(thumb(section, 'tone-iris'))).toEqual(['', '#f7f8f8', '#8467ec']);
    expect(squares(thumb(section, 'accent'))).toEqual([undefined, '', '']);
    expect(squares(thumb(section, 'custom'))).toEqual([undefined, '', '']);
    expect(thumb(section, 'accent').dataset.lnExtTheme).toBe('accent');
  });

  it('list the boards the user saved, in their colors, before the custom one', async () => {
    const { saveBoard } = await load();
    const id = saveBoard('Sea', { light: '#ffffff', dark: '#123456' }) ?? '';
    const section = await boardSection();
    const tile = queryOne(section, `[data-ln-ext-choice="${id}"]`, HTMLElement);
    expect(tile?.getAttribute('aria-label')).toBe('Sea');
    expect(
      queryOne(section, `[data-ln-ext-choice="${id}"] + *`, HTMLElement)?.dataset.lnExtChoice,
    ).toBe('custom');
    expect(squares(thumb(section, id))).toEqual(['', '#ffffff', '#123456']);
  });
});
