import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// The panel's parts share one area: only the one picked shows. The sheets come in the order
// index.css imports them, as the cascade decides which part is hidden.
const SHEETS = [
  'game/layout.css',
  'game/move-list.css',
  'game/chat.css',
  'game/zen.css',
  'analysis/layout.css',
  'analysis/controls.css',
  'panel-tabs.css',
];

const BAR = '<div class="ln-ext-panel-tabs"><div class="ln-ext-panel-tabs__bar"></div></div>';

const ROUND =
  '<main class="round"><div class="round__app"><i5d><aPp></aPp></i5d></div>' +
  '<div class="round__side"><section class="mchat"><div class="mchat__tabs"></div></section>' +
  `<div class="game__meta"></div></div>${BAR}</main>`;

const ANALYSE =
  '<main class="analyse"><div class="analyse__tools"></div>' +
  '<div class="analyse__controls"></div>' +
  `<section class="mchat"><div class="mchat__tabs"></div></section>${BAR}</main>`;

interface Panel {
  readonly page?: string;
  /** What content/layout/panel-tabs.ts marks the page with, or nothing before its first tick. */
  readonly part?: string;
  readonly tabbed?: boolean;
  readonly width?: number;
  readonly zen?: boolean;
}

function render({ page = ROUND, part, tabbed = true, width = 1280, zen = false }: Panel): void {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', width);
  const style = document.createElement('style');
  style.textContent = SHEETS.map(sheet =>
    readFileSync(join(import.meta.dirname, sheet), 'utf8'),
  ).join('\n');
  document.head.append(style);
  document.body.className = zen ? 'zenable zen' : '';
  document.body.innerHTML = page;
  const main = queryOne(document, 'main', HTMLElement);
  if (!main) throw new Error('no page');
  if (part !== undefined) main.dataset.lnExtPanel = part;
  if (tabbed) main.dataset.lnExtTabbed = '';
}

const displayOf = (selector: string): string => {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element).display;
};

const page = (): CSSStyleDeclaration => {
  const found = queryOne(document, 'main', HTMLElement);
  if (!found) throw new Error('no page');
  return getComputedStyle(found);
};

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.body.className = '';
});

describe('the game panel’s parts', () => {
  it('shows the moves alone while they are the part picked', () => {
    render({ part: 'moves' });
    expect(displayOf('i5d')).toBe('flex');
    expect(displayOf('.mchat')).toBe('none');
    expect(displayOf('.game__meta')).toBe('none');
  });

  it('shows the chat alone, Lichess’s own tabs left to ours', () => {
    render({ part: 'chat' });
    expect(displayOf('.mchat')).toBe('flex');
    expect(displayOf('i5d')).toBe('none');
    expect(displayOf('.mchat__tabs')).toBe('none');
  });

  it('shows the game info alone where it is the part picked', () => {
    render({ part: 'meta' });
    expect(displayOf('.game__meta')).toBe('block');
    expect(displayOf('i5d')).toBe('none');
  });

  it('keeps the moves until a part is picked, so the panel is never seen empty', () => {
    render({ tabbed: false });
    expect(displayOf('i5d')).toBe('flex');
    expect(displayOf('.mchat')).toBe('none');
    expect(page().getPropertyValue('--ln-ext-tabs-h')).toBe('0px');
  });

  it('gives the tab bar a row of its own, and none below 1020px', () => {
    render({ part: 'moves' });
    expect(displayOf('.ln-ext-panel-tabs')).toBe('flex');
    expect(page().getPropertyValue('--ln-ext-tabs-h')).toBe('44px');
    render({ part: 'moves', width: 390 });
    expect(displayOf('.ln-ext-panel-tabs')).toBe('none');
  });

  it('keeps the moves in Zen mode, whichever part the panel was showing', () => {
    render({ part: 'chat', zen: true });
    expect(displayOf('i5d')).toBe('flex');
    expect(displayOf('.ln-ext-panel-tabs')).toBe('none');
  });
});

describe('the analysis panel’s parts', () => {
  it('shows the engine and moves alone while they are the part picked', () => {
    render({ page: ANALYSE, part: 'moves' });
    expect(displayOf('.mchat')).toBe('none');
    expect(displayOf('.analyse__tools')).not.toBe('none');
    expect(page().getPropertyValue('--ln-ext-tabs-h')).toBe('44px');
  });

  it('shows the chat in their place, the controls left under it', () => {
    render({ page: ANALYSE, part: 'chat' });
    expect(displayOf('.mchat')).toBe('flex');
    expect(displayOf('.analyse__tools')).toBe('none');
    expect(displayOf('.analyse__controls')).toBe('flex');
  });
});
