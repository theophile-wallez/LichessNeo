import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BUILT_IN_THEMES } from '#content/colors/built-in.ts';
import type * as FlatBoards from './flat-boards.ts';
import type * as SavedBoards from './saved-boards.ts';

// The saved boards are cached in their module: each test imports fresh copies.
async function load(): Promise<typeof FlatBoards & typeof SavedBoards> {
  return { ...(await import('./flat-boards.ts')), ...(await import('./saved-boards.ts')) };
}

const root = document.documentElement;
const shown = (element: HTMLElement, names: readonly string[]): string[] =>
  names.map(name => element.style.getPropertyValue(name));
const FLAT = ['--ln-ext-board-flat-light', '--ln-ext-board-flat-dark'];

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  root.removeAttribute('style');
  localStorage.clear();
});

describe('the two-tone boards', () => {
  it('come in white and each color theme’s accent on the dark scheme', async () => {
    const { PRESET_BOARDS } = await load();
    expect(PRESET_BOARDS).toHaveLength(BUILT_IN_THEMES.length);
    expect(PRESET_BOARDS.slice(0, 3)).toEqual([
      { id: 'tone-neo', name: 'Neo', light: '#f7f8f8', dark: '#5e6ad2' },
      { id: 'tone-lichess', name: 'Lichess', light: '#f7f8f8', dark: '#d64f00' },
      { id: 'tone-ocean', name: 'Ocean', light: '#f7f8f8', dark: '#2f9bea' },
    ]);
  });

  it('find a preset, a material or a saved board by its id, and nothing else', async () => {
    const { flatBoard, saveBoard } = await load();
    expect(flatBoard('tone-ember')?.dark).toBe('#e2622a');
    expect(flatBoard('materials-marble')).toEqual({
      id: 'materials-marble',
      name: 'Marble',
      light: '#f7f5ef',
      dark: '#636b77',
      texture: 'marble',
      family: 'marble',
    });
    const id = saveBoard('Sea', { light: '#ffffff', dark: '#123456' }) ?? '';
    expect(flatBoard(id)).toEqual({ id, name: 'Sea', light: '#ffffff', dark: '#123456' });
    expect(flatBoard('accent')).toBeUndefined();
    expect(flatBoard('backlit')).toBeUndefined();
  });

  it('put the shown board’s colors on <html>, and take them off for another', async () => {
    const { flatBoard, showFlatBoard } = await load();
    showFlatBoard(flatBoard('tone-grove'));
    expect(shown(root, FLAT)).toEqual(['#f7f8f8', '#2a9f6d']);
    showFlatBoard(undefined);
    expect(shown(root, FLAT)).toEqual(['', '']);
  });

  it('put the shown board’s texture on <html>, and take it off for one without', async () => {
    const { flatBoard, showFlatBoard } = await load();
    const texture = ['--ln-ext-board-flat-texture', '--ln-ext-board-flat-strength'];
    showFlatBoard(flatBoard('materials-felt'));
    expect(shown(root, texture)).toEqual(['var(--ln-ext-texture-felt)', '100%']);
    showFlatBoard(flatBoard('tone-grove'));
    expect(shown(root, texture)).toEqual(['', '']);
  });

  it('give a tile its squares to draw', async () => {
    const { showSquares } = await load();
    const thumb = document.createElement('span');
    showSquares(thumb, { light: '#eeeeee', dark: '#333333' });
    expect(thumb.dataset.lnExtSquares).toBe('');
    expect(shown(thumb, ['--ln-ext-thumb-light', '--ln-ext-thumb-dark'])).toEqual([
      '#eeeeee',
      '#333333',
    ]);
    showSquares(thumb, { light: '#eeeeee', dark: '#333333', texture: 'cork', strength: 20 });
    expect(shown(thumb, ['--ln-ext-thumb-texture', '--ln-ext-thumb-strength'])).toEqual([
      'var(--ln-ext-texture-cork)',
      '20%',
    ]);
  });
});
