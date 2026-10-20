import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BACKLIT_BOARDS } from '#shared/backlit.ts';
import type * as SavedBoards from './saved-boards.ts';
import type * as Themes from './themes.ts';

// The saved boards are cached in their module: each test imports fresh copies.
async function load(): Promise<typeof Themes & typeof SavedBoards> {
  return { ...(await import('./themes.ts')), ...(await import('./saved-boards.ts')) };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  localStorage.clear();
});

describe('the extension’s themes', () => {
  it('list the accent’s board, the presets, the saved boards, the custom one, then the backlit family', async () => {
    const { saveBoard, themesOf } = await load();
    const before = themesOf('board').map(theme => theme.id);
    expect(before[0]).toBe('accent');
    expect(before[1]).toBe('tone-neo');
    expect(before.slice(-7)).toEqual(['custom', ...BACKLIT_BOARDS.map(board => board.id)]);
    const id = saveBoard('Sea', { light: '#ffffff', dark: '#123456' }) ?? '';
    const after = themesOf('board');
    expect(after.map(theme => theme.id)).toEqual([...before.slice(0, -7), id, ...before.slice(-7)]);
    expect(after.find(theme => theme.id === id)).toEqual({
      id,
      name: 'Sea',
      colors: { light: '#ffffff', dark: '#123456' },
      saved: true,
    });
  });

  it('give the presets their squares, and the backlit boards their family', async () => {
    const { themesOf } = await load();
    const boards = themesOf('board');
    expect(boards.find(theme => theme.id === 'tone-ocean')?.colors).toEqual({
      light: '#f7f8f8',
      dark: '#2f9bea',
    });
    expect(boards.find(theme => theme.id === 'accent')?.colors).toBeUndefined();
    expect(boards.find(theme => theme.id === 'custom')?.colors).toBeUndefined();
    expect(boards.filter(theme => theme.family === 'backlit')).toHaveLength(BACKLIT_BOARDS.length);
  });

  it('know a saved board as a theme until it’s deleted', async () => {
    const { deleteBoard, familyOf, isTheme, saveBoard } = await load();
    const id = saveBoard('Sea', { light: '#ffffff', dark: '#123456' }) ?? '';
    expect(isTheme('board', id)).toBe(true);
    expect(familyOf('board', id)).toBeNull();
    deleteBoard(id);
    expect(isTheme('board', id)).toBe(false);
    expect(familyOf('board', 'backlit-forest')).toBe('backlit');
    expect(isTheme('board', 'blue')).toBe(false);
  });

  it('give the sounds the Ascent and Boxwood sets, and the pieces nothing yet', async () => {
    const { isTheme, themesOf } = await load();
    expect(themesOf('sound')).toEqual([
      { id: 'foley', name: 'Ascent' },
      { id: 'boxwood', name: 'Boxwood' },
    ]);
    expect(themesOf('piece')).toEqual([]);
    expect(isTheme('sound', 'accent')).toBe(false);
  });
});
