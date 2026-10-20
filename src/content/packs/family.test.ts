import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { trackListeners } from '#shared/testing/listeners.ts';
import { flush } from '#shared/testing/timers.ts';
import { watchDasher } from './dasher.ts';
import { createLibrary, type Library } from './library.ts';

// The extension's themes that come with settings: the backlit boards, a
// family under one tile, and the sound set.

const PANELS = {
  board:
    '<div class="sub board d2"><button class="head">Board</button>' +
    '<div class="list"><button class="active"><span></span></button></div></div>',
  sound:
    '<div class="sub sound standard"><button class="head">Sound</button><div class="content">' +
    '<input type="range"><div class="selector"><button class="active">Standard</button></div>' +
    '</div></div>',
};

let stopListeners: () => void;

async function start(): Promise<Library> {
  const library = createLibrary({
    readPicked: () => Promise.resolve([]),
    readAll: () => Promise.resolve([]),
    save: () => Promise.resolve(),
    erase: () => Promise.resolve(),
    show: () => undefined,
  });
  await library.ready;
  watchDasher(library);
  return library;
}

async function openPanel(kind: keyof typeof PANELS): Promise<HTMLElement> {
  const app = document.getElementById('dasher_app');
  if (app) app.innerHTML = PANELS[kind];
  await flush();
  const panel = queryOne(document, `#dasher_app .sub.${kind}`, HTMLElement);
  if (!panel) throw new Error('no panel');
  return panel;
}

const section = (panel: HTMLElement): HTMLElement | null =>
  queryOne(panel, '.ln-ext-src-choices', HTMLElement);
const familyView = (panel: HTMLElement): HTMLElement | null =>
  queryOne(panel, '.ln-ext-src-family[data-ln-ext-family="backlit"]', HTMLElement);
const familyTile = (panel: HTMLElement): HTMLElement | null =>
  queryOne(panel, '.ln-ext-src-family-item', HTMLElement);
const button = (panel: HTMLElement, selector: string): HTMLElement => {
  const found = queryOne(panel, selector, HTMLElement);
  if (!found) throw new Error(`no ${selector}`);
  return found;
};
const picked = (row: HTMLElement): (string | undefined)[] =>
  queryAll(row, 'button.active', HTMLElement).map(option => option.dataset.lnExtOption);

beforeEach(() => {
  stopListeners = trackListeners(document);
  document.body.innerHTML =
    '<div id="top"><div class="dasher"><div id="dasher_app"></div></div></div>';
  document.body.dataset.user = 'ann';
});

afterEach(() => {
  stopListeners();
  localStorage.clear();
  document.body.innerHTML = '';
  delete document.body.dataset.user;
});

describe('the backlit family', () => {
  it('opens from its tile onto its boards and settings, and back', async () => {
    await start();
    const panel = await openPanel('board');
    expect(section(panel)?.dataset.lnExtOpen).toBeUndefined();
    expect(familyView(panel)?.hidden).toBe(true);
    familyTile(panel)?.click();
    expect(section(panel)?.dataset.lnExtOpen).toBe('backlit');
    expect(familyView(panel)?.hidden).toBe(false);
    const view = familyView(panel);
    expect(
      queryAll(view ?? panel, '.ln-ext-src-item', HTMLElement).map(item =>
        item.getAttribute('aria-label'),
      ),
    ).toEqual(['Slate', 'Midnight', 'Forest', 'Walnut', 'Amethyst', 'Panda']);
    expect(
      queryAll(view ?? panel, '.ln-ext-src-option-label', HTMLElement).map(
        label => label.textContent,
      ),
    ).toEqual(['Light', 'Wave', 'Waves on', 'Gap', 'Corners']);
    button(panel, '.ln-ext-src-back').click();
    expect(section(panel)?.dataset.lnExtOpen).toBeUndefined();
    expect(familyView(panel)?.hidden).toBe(true);
  });

  it('rings its tile with the board picked in it, and opens on it next time', async () => {
    const library = await start();
    let panel = await openPanel('board');
    familyTile(panel)?.click();
    button(panel, '[data-ln-ext-choice="backlit-forest"]').click();
    expect(library.current('board')).toBe('backlit-forest');
    await flush();
    expect(familyTile(panel)?.classList.contains('active')).toBe(true);
    expect(
      queryOne(panel, '.ln-ext-src-family-item .ln-ext-src-thumb', HTMLElement)?.dataset.lnExtTheme,
    ).toBe('backlit-forest');
    expect(
      button(panel, '[data-ln-ext-choice="backlit-forest"]').classList.contains('active'),
    ).toBe(true);
    panel = await openPanel('board');
    expect(section(panel)?.dataset.lnExtOpen).toBe('backlit');
    button(panel, '.ln-ext-src-back').click();
    button(panel, '[data-ln-ext-choice="accent"]').click();
    await flush();
    expect(familyTile(panel)?.classList.contains('active')).toBe(false);
  });

  it('keeps its settings, the same for all its boards', async () => {
    localStorage.setItem('ln-ext-backlit-reach', 'wide');
    await start();
    const panel = await openPanel('board');
    const [light, reach, waves] = queryAll(
      panel,
      '.ln-ext-src-family .ln-ext-src-option-row',
      HTMLElement,
    );
    if (!light || !reach || !waves) throw new Error('no rows');
    expect([picked(light), picked(reach), picked(waves)]).toEqual([
      ['accent'],
      ['wide'],
      ['captures'],
    ]);
    button(light, '[data-ln-ext-option="rainbow"]').click();
    expect(picked(light)).toEqual(['rainbow']);
    expect(localStorage.getItem('ln-ext-backlit-light')).toBe('rainbow');
    expect(button(light, '[data-ln-ext-option="sides"]').dataset.lnExtTip).toBe(
      'One color for White, one for Black',
    );
  });
});

describe('the sound set', () => {
  it('shows where it puts the sounds while it’s picked, beside the volume', async () => {
    const library = await start();
    const panel = await openPanel('sound');
    expect(names(panel)).toEqual(['Ascent']);
    const row = button(panel, '.content .ln-ext-src-option-row[data-ln-ext-for="foley"]');
    expect(row.hidden).toBe(true);
    button(panel, '[data-ln-ext-choice="foley"]').click();
    expect(library.current('sound')).toBe('foley');
    await flush();
    expect(row.hidden).toBe(false);
    expect(picked(row)).toEqual(['space']);
    button(row, '[data-ln-ext-option="stereo"]').click();
    expect(localStorage.getItem('ln-ext-sound-place')).toBe('stereo');
  });
});

function names(panel: HTMLElement): (string | null)[] {
  return queryAll(panel, '.ln-ext-src-listing .ln-ext-src-item', HTMLElement).map(
    item => item.textContent,
  );
}
