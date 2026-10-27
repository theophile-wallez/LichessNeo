import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import type * as BlackPieces from './black-pieces.ts';

// The filter and the listeners are kept in the module: each test imports a fresh copy.
const load = async (): Promise<typeof BlackPieces> => import('./black-pieces.ts');

const root = document.documentElement;
const KEY = 'ln-ext-black-pieces';

function find<T extends Element>(parent: ParentNode, selector: string, type: new () => T): T {
  const found = queryOne(parent, selector, type);
  if (!found) throw new Error(`no ${selector}`);
  return found;
}

const tables = (): (string | null)[] =>
  queryAll(document, '#ln-ext-black-pieces feComponentTransfer > *', SVGElement).map(func =>
    func.getAttribute('tableValues'),
  );

const ringed = (row: HTMLElement): (string | undefined)[] =>
  queryAll(row, '.active', HTMLElement).map(element => element.dataset.lnExtColor ?? 'own');

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  document.body.innerHTML = '';
  delete root.dataset.lnExtBlackPieces;
  localStorage.clear();
});

describe('the black pieces’ color', () => {
  it('maps black to the color, channel by channel, and keeps white', async () => {
    const { tintTables } = await load();
    expect(tintTables('#5f6878')).toEqual(['0.3725 1', '0.4078 1', '0.4706 1']);
    expect(tintTables('#000000')).toEqual(['0 1', '0 1', '0 1']);
    expect(tintTables('#ff8000')).toEqual(['1 1', '0.502 1', '0 1']);
  });

  it('leaves the pieces as drawn, with no filter on the page, until a color is picked', async () => {
    const { followBlackPieces } = await load();
    followBlackPieces();
    expect(root.dataset.lnExtBlackPieces).toBeUndefined();
    expect(document.getElementById('ln-ext-black-pieces')).toBeNull();
  });

  it('shows a stored color from the start', async () => {
    localStorage.setItem(KEY, '#474d5a');
    const { followBlackPieces } = await load();
    followBlackPieces();
    expect(root.dataset.lnExtBlackPieces).toBe('');
    expect(tables()).toEqual(['0.2784 1', '0.302 1', '0.3529 1']);
  });

  it('ignores a stored value that isn’t a color', async () => {
    localStorage.setItem(KEY, 'url(#evil)');
    const { followBlackPieces, readBlackPieces } = await load();
    followBlackPieces();
    expect(readBlackPieces()).toBe('#000000');
    expect(root.dataset.lnExtBlackPieces).toBeUndefined();
  });

  it('takes a tone or any color from its row, and goes back to the set’s own', async () => {
    const { blackPiecesRow, followBlackPieces } = await load();
    followBlackPieces();
    const row = blackPiecesRow();
    document.body.append(row);
    expect(row.querySelector('.ln-ext-src-option-label')?.textContent).toBe('Black pieces');
    expect(ringed(row)).toEqual(['#000000']);
    find(row, '[data-ln-ext-tip="Slate"]', HTMLElement).click();
    expect(localStorage.getItem(KEY)).toBe('#474d5a');
    expect(root.dataset.lnExtBlackPieces).toBe('');
    expect(ringed(row)).toEqual(['#474d5a']);
    const input = find(row, 'input', HTMLInputElement);
    input.value = '#FF8000';
    input.dispatchEvent(new Event('input'));
    expect(localStorage.getItem(KEY)).toBe('#ff8000');
    expect(tables()).toEqual(['1 1', '0.502 1', '0 1']);
    expect(ringed(row)).toEqual(['own']);
    find(row, '[data-ln-ext-tip="As drawn"]', HTMLElement).click();
    expect(root.dataset.lnExtBlackPieces).toBeUndefined();
    // One filter, written again rather than added again.
    expect(queryAll(document, '.ln-ext-filters', SVGSVGElement)).toHaveLength(1);
  });

  it('follows a color picked in another tab', async () => {
    const { blackPiecesRow, followBlackPieces } = await load();
    followBlackPieces();
    const row = blackPiecesRow();
    document.body.append(row);
    localStorage.setItem(KEY, '#4a3a2e');
    window.dispatchEvent(new StorageEvent('storage', { key: KEY, storageArea: localStorage }));
    expect(root.dataset.lnExtBlackPieces).toBe('');
    expect(ringed(row)).toEqual(['#4a3a2e']);
  });
});
