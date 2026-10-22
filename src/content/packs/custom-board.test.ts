import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  chooseSquareColor,
  chooseStrength,
  chooseTexture,
  customStrength,
  DEFAULT_CUSTOM_BOARD,
  isHexColor,
  onCustomBoardChange,
  readCustomBoard,
  showCustomBoard,
} from './custom-board.ts';

const root = document.documentElement;
const texture = (): string[] =>
  ['--ln-ext-board-custom-texture', '--ln-ext-board-custom-strength'].map(name =>
    root.style.getPropertyValue(name),
  );
const shown = (): string[] =>
  ['--ln-ext-board-custom-light', '--ln-ext-board-custom-dark'].map(name =>
    root.style.getPropertyValue(name),
  );

afterEach(() => {
  root.removeAttribute('style');
  localStorage.clear();
});

describe('the custom board', () => {
  it('is white and our first blue until the user picks its colors', () => {
    expect(readCustomBoard()).toEqual({ light: '#f7f8f8', dark: '#5e6ad2' });
    showCustomBoard();
    expect(shown()).toEqual(['#f7f8f8', '#5e6ad2']);
  });

  it('keeps a color picked for one shade, as the color input gives it, and shows it at once', () => {
    const changed = vi.fn<() => void>();
    onCustomBoardChange(changed);
    chooseSquareColor('dark', '#1A2B3C');
    expect(readCustomBoard()).toEqual({ light: DEFAULT_CUSTOM_BOARD.light, dark: '#1a2b3c' });
    expect(JSON.parse(localStorage.getItem('ln-ext-custom-board') ?? '')).toEqual({
      light: '#f7f8f8',
      dark: '#1a2b3c',
    });
    expect(shown()).toEqual(['#f7f8f8', '#1a2b3c']);
    expect(changed).toHaveBeenCalledOnce();
  });

  it('stops telling a listener of its changes once it says so', () => {
    const changed = vi.fn<() => void>();
    const stop = onCustomBoardChange(changed);
    chooseSquareColor('dark', '#123456');
    stop();
    chooseSquareColor('dark', '#654321');
    expect(changed).toHaveBeenCalledOnce();
  });

  it('reads damaged colors as the default', () => {
    localStorage.setItem('ln-ext-custom-board', JSON.stringify({ light: 'red', dark: '#000000' }));
    expect(readCustomBoard()).toEqual(DEFAULT_CUSTOM_BOARD);
    localStorage.setItem('ln-ext-custom-board', '{');
    expect(readCustomBoard()).toEqual(DEFAULT_CUSTOM_BOARD);
  });

  it('lays a texture over its colors at the strength picked, and takes it off', () => {
    const changed = vi.fn<() => void>();
    onCustomBoardChange(changed);
    expect(customStrength()).toBe(100);
    chooseTexture('slate');
    expect(readCustomBoard()).toEqual({ ...DEFAULT_CUSTOM_BOARD, texture: 'slate' });
    expect(texture()).toEqual(['var(--ln-ext-texture-slate)', '100%']);
    chooseStrength(35);
    expect(customStrength()).toBe(35);
    expect(texture()).toEqual(['var(--ln-ext-texture-slate)', '35%']);
    chooseTexture(undefined);
    expect(JSON.parse(localStorage.getItem('ln-ext-custom-board') ?? '')).toEqual({
      ...DEFAULT_CUSTOM_BOARD,
      strength: 35,
    });
    expect(texture()).toEqual(['', '']);
    expect(changed).toHaveBeenCalledTimes(3);
  });

  it('reads a board kept before textures as it was, and keeps its colors when its texture is gone', () => {
    localStorage.setItem(
      'ln-ext-custom-board',
      JSON.stringify({ light: '#ffffff', dark: '#000000' }),
    );
    expect(readCustomBoard()).toEqual({ light: '#ffffff', dark: '#000000' });
    localStorage.setItem(
      'ln-ext-custom-board',
      JSON.stringify({ light: '#ffffff', dark: '#000000', texture: 'velvet', strength: 60 }),
    );
    expect(readCustomBoard()).toEqual({ light: '#ffffff', dark: '#000000', strength: 60 });
  });

  it('keeps only colors written #rrggbb', () => {
    expect(isHexColor('#a1B2c3')).toBe(true);
    expect(isHexColor('#abc')).toBe(false);
    expect(isHexColor('a1b2c3')).toBe(false);
    expect(isHexColor('#a1b2c3d4')).toBe(false);
  });
});
