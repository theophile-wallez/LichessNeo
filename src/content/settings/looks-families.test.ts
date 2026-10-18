import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BACKLIT_BOARDS } from '#shared/backlit.ts';
import { createElement, queryAll } from '#shared/dom.ts';
import { FAMILY_ROWS } from '#content/packs/options.ts';
import type { Theme } from '#content/packs/themes.ts';
import { familySections, hasFamilies } from './looks-families.ts';

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => name } });
});

const tile = ({ id }: Theme): HTMLElement =>
  createElement('button', { attrs: { 'data-ln-ext-choice': id } });

describe('a looks card’s families', () => {
  it('are the boards’ only', () => {
    expect(hasFamilies('board')).toBe(true);
    expect(hasFamilies('piece')).toBe(false);
    expect(hasFamilies('sound')).toBe(false);
    expect(familySections('piece', tile)).toEqual([]);
    expect(familySections('sound', tile)).toEqual([]);
  });

  it('give the backlit boards a title, their tiles, then the settings they share', () => {
    const [title, grid, rows, ...rest] = familySections('board', tile);
    expect(rest).toEqual([]);
    expect(title?.tagName).toBe('H4');
    expect(title?.textContent).toBe('looksBacklit');
    expect(
      queryAll(grid ?? document, 'button', HTMLElement).map(button => button.dataset.lnExtChoice),
    ).toEqual(BACKLIT_BOARDS.map(board => board.id));
    expect(rows?.dataset.lnExtFamily).toBe('backlit');
    expect(rows?.children).toHaveLength(FAMILY_ROWS.backlit?.length ?? -1);
  });
});
