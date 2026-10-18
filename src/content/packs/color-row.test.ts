import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import type * as ColorRow from './color-row.ts';
import type * as LibraryModule from './library.ts';
import type { Library } from './library.ts';
import type * as SavedBoards from './saved-boards.ts';

// The saved boards are cached in their module: each test imports fresh copies.
type Modules = typeof ColorRow & typeof LibraryModule & typeof SavedBoards;

async function load(): Promise<Modules> {
  return {
    ...(await import('./color-row.ts')),
    ...(await import('./library.ts')),
    ...(await import('./saved-boards.ts')),
  };
}

const root = document.documentElement;
const stored = (): unknown => JSON.parse(localStorage.getItem('ln-ext-custom-board') ?? 'null');

function find<T extends Element>(parent: ParentNode, selector: string, type: new () => T): T {
  const found = queryOne(parent, selector, type);
  if (!found) throw new Error(`no ${selector}`);
  return found;
}

const active = (row: HTMLElement): (string | undefined)[] =>
  queryAll(row, '.active', HTMLElement).map(
    element => element.dataset.lnExtColor ?? element.className,
  );

// In the page, as in an open panel: a row taken out stops following the board.
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

describe('the custom board’s color rows', () => {
  it('stop following the board once out of the page', async () => {
    const { colorRow } = await load();
    const shown = inPage(colorRow('light'));
    const gone = inPage(colorRow('light'));
    gone.remove();
    find(shown, '[data-ln-ext-tip="Ivory"]', HTMLElement).click();
    expect(active(shown)).toEqual(['#f0ead8']);
    expect(active(gone)).toEqual(['#f7f8f8']);
  });

  it('offer pale tones for the light squares, the one shown ringed', async () => {
    const { colorRow } = await load();
    const row = inPage(colorRow('light'));
    expect(
      queryAll(row, '[data-ln-ext-color]', HTMLElement).map(swatch => swatch.dataset.lnExtTip),
    ).toEqual(['White', 'Ivory', 'Mist', 'Lilac']);
    expect(active(row)).toEqual(['#f7f8f8']);
    expect(find(row, 'input', HTMLInputElement).value).toBe('#f7f8f8');
    find(row, '[data-ln-ext-tip="Ivory"]', HTMLElement).click();
    expect(stored()).toEqual({ light: '#f0ead8', dark: '#5e6ad2' });
    expect(root.style.getPropertyValue('--ln-ext-board-custom-light')).toBe('#f0ead8');
    expect(active(row)).toEqual(['#f0ead8']);
  });

  it('take any color from the picker as it’s dragged, its code beside it', async () => {
    const { colorRow } = await load();
    const row = inPage(colorRow('dark'));
    expect(queryAll(row, '[data-ln-ext-color]', HTMLElement)).toEqual([]);
    expect(active(row)).toEqual(['ln-ext-src-color-own active']);
    expect(find(row, '.ln-ext-src-color-code', HTMLElement).textContent).toBe('#5e6ad2');
    const input = find(row, 'input', HTMLInputElement);
    input.value = '#ABCDEF';
    input.dispatchEvent(new Event('input'));
    expect(stored()).toEqual({ light: '#f7f8f8', dark: '#abcdef' });
    expect(root.style.getPropertyValue('--ln-ext-board-custom-dark')).toBe('#abcdef');
    expect(find(row, '.ln-ext-src-color-code', HTMLElement).textContent).toBe('#abcdef');
    const own = find(row, '.ln-ext-src-color-own', HTMLElement);
    expect(own.style.getPropertyValue('--ln-ext-src-color')).toBe('#abcdef');
  });

  it('ring the picker for a color off the swatches, in every row shown', async () => {
    const { colorRow } = await load();
    const menu = inPage(colorRow('light'));
    const settings = inPage(colorRow('light'));
    const input = find(menu, 'input', HTMLInputElement);
    input.value = '#123456';
    input.dispatchEvent(new Event('input'));
    for (const row of [menu, settings]) {
      expect(active(row)).toEqual(['ln-ext-src-color-own active']);
      expect(find(row, 'input', HTMLInputElement).value).toBe('#123456');
    }
  });
});

async function start(): Promise<{
  library: Library;
  form: HTMLFormElement;
  name: HTMLInputElement;
  loaded: Modules;
}> {
  const loaded = await load();
  const library = loaded.createLibrary({
    readPicked: () => Promise.resolve([]),
    readAll: () => Promise.resolve([]),
    save: () => Promise.resolve(),
    erase: () => Promise.resolve(),
    show: () => undefined,
  });
  const row = loaded.saveRow(library);
  return {
    library,
    form: find(row, 'form', HTMLFormElement),
    name: find(row, 'input', HTMLInputElement),
    loaded,
  };
}

describe('the custom board’s save row', () => {
  it('saves the custom board under its name and shows that board', async () => {
    localStorage.setItem(
      'ln-ext-custom-board',
      JSON.stringify({ light: '#e6dcf2', dark: '#202020' }),
    );
    const { library, form, name, loaded } = await start();
    expect(name.maxLength).toBe(24);
    name.value = '  Night  ';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    const [board] = loaded.savedBoards();
    expect(board).toMatchObject({ name: 'Night', light: '#e6dcf2', dark: '#202020' });
    expect(library.current('board')).toBe(board?.id);
    expect(name.value).toBe('');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(loaded.savedBoards().at(-1)?.name).toBe('My board');
  });

  it('keeps the name typed once the list is full', async () => {
    const full = Array.from({ length: 24 }, (_, i) => ({
      id: `saved-${i}`,
      name: `Board ${i}`,
      light: '#ffffff',
      dark: '#000000',
    }));
    localStorage.setItem('ln-ext-saved-boards', JSON.stringify(full));
    const { library, form, name, loaded } = await start();
    name.value = 'Night';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(loaded.savedBoards()).toHaveLength(24);
    expect(name.value).toBe('Night');
    expect(library.current('board')).toBe('accent');
  });
});
