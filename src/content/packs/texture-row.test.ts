import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import type * as CustomBoard from './custom-board.ts';
import type * as TextureRow from './texture-row.ts';

// The rows follow the custom board through its module's listeners: each test imports fresh copies.
async function load(): Promise<typeof CustomBoard & typeof TextureRow> {
  return { ...(await import('./custom-board.ts')), ...(await import('./texture-row.ts')) };
}

const root = document.documentElement;
const stored = (): unknown => JSON.parse(localStorage.getItem('ln-ext-custom-board') ?? 'null');

function find<T extends Element>(parent: ParentNode, selector: string, type: new () => T): T {
  const found = queryOne(parent, selector, type);
  if (!found) throw new Error(`no ${selector}`);
  return found;
}

const ringed = (row: HTMLElement): (string | undefined)[] =>
  queryAll(row, '.active', HTMLElement).map(tile => tile.dataset.lnExtTexture);

function inPage(row: HTMLElement): HTMLElement {
  document.body.append(row);
  return row;
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  document.body.innerHTML = '';
  root.removeAttribute('style');
  localStorage.clear();
});

describe('the custom board’s texture row', () => {
  it('offers none, then each texture on a tile of its own, none ringed at first', async () => {
    const { textureRow } = await load();
    const row = inPage(textureRow());
    expect(row.dataset.lnExtFor).toBe('custom');
    const tiles = queryAll(row, '[data-ln-ext-texture]', HTMLElement);
    expect(tiles.map(tile => tile.dataset.lnExtTip)).toEqual([
      'None',
      'Ash',
      'Parquet',
      'End grain',
      'Marble',
      'Terrazzo',
      'Slate',
      'Brushed metal',
      'Spun metal',
      'Zellige',
      'Felt',
      'Leather',
      'Blueprint',
      'Halftone',
      'Cork',
    ]);
    expect(tiles[0]?.style.getPropertyValue('--ln-ext-thumb-texture')).toBe('');
    expect(tiles[4]?.style.getPropertyValue('--ln-ext-thumb-texture')).toBe(
      'var(--ln-ext-texture-marble)',
    );
    expect(ringed(row)).toEqual(['none']);
  });

  it('lays the texture picked over the board, and takes it off with none', async () => {
    const { textureRow } = await load();
    const row = inPage(textureRow());
    find(row, '[data-ln-ext-texture="felt"]', HTMLElement).click();
    expect(stored()).toEqual({ light: '#f7f8f8', dark: '#5e6ad2', texture: 'felt' });
    expect(root.style.getPropertyValue('--ln-ext-board-custom-texture')).toBe(
      'var(--ln-ext-texture-felt)',
    );
    expect(ringed(row)).toEqual(['felt']);
    find(row, '[data-ln-ext-texture="none"]', HTMLElement).click();
    expect(stored()).toEqual({ light: '#f7f8f8', dark: '#5e6ad2' });
    expect(ringed(row)).toEqual(['none']);
  });

  it('stops following the board once out of the page', async () => {
    const { chooseTexture, textureRow } = await load();
    const shown = inPage(textureRow());
    const gone = inPage(textureRow());
    gone.remove();
    chooseTexture('cork');
    expect(ringed(shown)).toEqual(['cork']);
    expect(ringed(gone)).toEqual(['none']);
  });
});

describe('the custom board’s strength row', () => {
  it('waits for a texture, then sets how strongly it shows as it’s dragged', async () => {
    const { chooseTexture, strengthRow } = await load();
    const row = inPage(strengthRow());
    expect(row.dataset.lnExtFor).toBe('custom');
    const slider = find(row, 'input', HTMLInputElement);
    expect(slider.disabled).toBe(true);
    expect(slider.valueAsNumber).toBe(100);
    chooseTexture('leather');
    expect(slider.disabled).toBe(false);
    slider.value = '45';
    slider.dispatchEvent(new Event('input'));
    expect(stored()).toEqual({
      light: '#f7f8f8',
      dark: '#5e6ad2',
      texture: 'leather',
      strength: 45,
    });
    expect(root.style.getPropertyValue('--ln-ext-board-custom-strength')).toBe('45%');
    expect(find(row, 'output', HTMLOutputElement).textContent).toBe('45%');
  });
});
