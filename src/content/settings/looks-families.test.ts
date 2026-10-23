import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BACKLIT_BOARDS } from '#shared/backlit.ts';
import { createElement, queryAll } from '#shared/dom.ts';
import { PRESET_BOARDS } from '#content/packs/flat-boards.ts';
import { MATERIAL_BOARDS } from '#content/packs/materials.ts';
import { FAMILY_ROWS } from '#content/packs/options.ts';
import type { Theme } from '#content/packs/themes.ts';
import { familySections, hasFamilies, listedThemes } from './looks-families.ts';

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => name } });
});

const tile = ({ id }: Theme): HTMLElement =>
  createElement('button', { attrs: { 'data-ln-ext-choice': id } });

const choices = (grid: Element | undefined): (string | undefined)[] =>
  queryAll(grid ?? document, 'button', HTMLElement).map(button => button.dataset.lnExtChoice);

describe('a looks card’s families', () => {
  it('are the boards’ only', () => {
    expect(hasFamilies('board')).toBe(true);
    expect(hasFamilies('piece')).toBe(false);
    expect(hasFamilies('sound')).toBe(false);
    expect(familySections('piece', tile)).toEqual([]);
    expect(familySections('sound', tile)).toEqual([]);
  });

  it('list the classic boards, each family with its settings, then the title of the user’s', () => {
    const sections = familySections('board', tile);
    expect(
      sections.filter(section => section.tagName === 'H4').map(title => title.textContent),
    ).toEqual([
      'looksClassic',
      'looksWood',
      'looksMarble',
      'looksMisc',
      'looksBacklit',
      'looksCustom',
    ]);
    expect(choices(sections[1])).toEqual(['accent', ...PRESET_BOARDS.map(board => board.id)]);
    const wood = MATERIAL_BOARDS.filter(board => board.family === 'wood');
    expect(choices(sections[3])).toEqual(wood.map(board => board.id));
    expect(sections[4]?.children).toHaveLength(0);
    const [grid, rows, custom, ...rest] = sections.slice(-3);
    expect(rest).toEqual([]);
    expect(choices(grid)).toEqual(BACKLIT_BOARDS.map(board => board.id));
    expect(rows?.dataset.lnExtFamily).toBe('backlit');
    expect(rows?.children).toHaveLength(FAMILY_ROWS.backlit?.length ?? -1);
    expect(custom?.textContent).toBe('looksCustom');
  });

  it('leave the custom board and the saved ones to the card’s own list, beside the packs', () => {
    expect(listedThemes('board').map(theme => theme.id)).toEqual(['custom']);
    expect(listedThemes('sound').map(theme => theme.name)).toEqual(['Ascent', 'Boxwood']);
  });
});
