import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { commandPalette } from './index.ts';

// Lichess's header as it serves it: the nav, and its search box among the buttons.
const HEADER = `<header id="top"><nav id="topnav">
  <section><a href="/training">Puzzles</a>
    <div role="group"><a href="/training/themes">Puzzle Themes</a><a href="/storm">Puzzle Storm</a></div>
  </section></nav>
  <div class="site-buttons"><div id="clinput"><input spellcheck="false" /></div></div></header>`;

const dialog = (): HTMLDialogElement | null =>
  queryOne(document, '#ln-ext-palette', HTMLDialogElement);

function field(): HTMLInputElement {
  const input = queryOne(document, '.ln-ext-palette__input', HTMLInputElement);
  if (!input) throw new Error('no palette field');
  return input;
}

function type(text: string): void {
  field().value = text;
  field().dispatchEvent(new Event('input'));
}

const press = (key: string): boolean =>
  field().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

const rows = (): string[] =>
  queryAll(document, '.ln-ext-palette__label', HTMLElement).map(label => label.textContent);

const picked = (): string | undefined =>
  queryOne(document, "[aria-selected='true'] .ln-ext-palette__label", HTMLElement)?.textContent;

const shortcut = (): boolean =>
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true, cancelable: true }),
  );

const open = (): void => queryOne(document, '#ln-ext-search', HTMLElement)?.click();

// The palette is started once, as on a page: its shortcut listens on the window for good.
beforeAll(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => name } });
  document.body.innerHTML = HEADER;
  commandPalette.start();
});

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => name } });
});

afterEach(() => {
  dialog()?.close();
  vi.restoreAllMocks();
});

describe('the command palette', () => {
  it('opens from the sidebar’s search button, the actions over the pages', () => {
    open();
    expect(dialog()?.open).toBe(true);
    expect(rows().slice(0, 1)).toEqual(['schemeToggleToLight']);
    expect(rows()).toContain('Puzzle Storm');
    expect(rows()).not.toContain('settingsPageAppearance');
  });

  it('opens in place of Lichess’s search box, which its shortcuts focus', () => {
    const lichessBox = queryOne(document, '#clinput input', HTMLInputElement);
    if (!lichessBox) throw new Error('no search box');
    lichessBox.value = '/';
    lichessBox.dispatchEvent(new FocusEvent('focus'));
    expect(dialog()?.open).toBe(true);
    expect(lichessBox.value).toBe('');
  });

  it('opens and closes on Ctrl+K, or ⌘K on a Mac', () => {
    expect(shortcut()).toBe(false);
    expect(dialog()?.open).toBe(true);
    shortcut();
    expect(dialog()?.open).toBe(false);
  });

  it('finds what is typed, picked with the arrows', () => {
    open();
    type('puzzle');
    expect(rows()).toEqual(['Puzzles', 'Puzzle Themes', 'Puzzle Storm']);
    expect(picked()).toBe('Puzzles');
    press('ArrowDown');
    expect(picked()).toBe('Puzzle Themes');
    press('ArrowUp');
    press('ArrowUp');
    expect(picked()).toBe('Puzzle Storm');
  });

  it('runs the action picked on Enter, and closes', () => {
    const post = vi.spyOn(window, 'postMessage');
    open();
    type('light');
    press('Enter');
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({ scheme: 'light' }),
      location.origin,
    );
    expect(dialog()?.open).toBe(false);
  });

  it('adds the players Lichess finds, saying nothing found only once it answered', async () => {
    const answer = { result: [{ name: 'DrNykterstein', title: 'GM' }] };
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify(answer)));
    open();
    type('drnyk');
    expect(queryOne(document, '.ln-ext-palette__empty', HTMLElement)).toBeNull();
    await vi.waitFor(() => expect(rows()).toEqual(['GM DrNykterstein']));
    type('zzzzqq');
    await vi.waitFor(() =>
      expect(queryOne(document, '.ln-ext-palette__empty', HTMLElement)?.textContent).toBe(
        'paletteNothing',
      ),
    );
  });
});
