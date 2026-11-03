import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// The analysis menu, which floats from the cogs: the controls' button as one from 1020px,
// shown over the review's summary, and its "Continue from here" as a sub-menu.
const SHEETS = ['board-tools.css', 'continue-with.css', '../review/layout.css'];

const PAGE =
  '<main class="analyse"><div class="analyse__tools"><div class="ceval"></div>' +
  '<div class="action-menu"><div class="title">Analysis board</div><div class="inner">' +
  '<div class="action-menu__tools"><button>Flip board</button></div>' +
  '<div class="continue-with none"><a class="button">Play against computer</a></div></div>' +
  '<button class="ln-ext-menu-back">Continue from here</button></div></div>' +
  '<div class="analyse__controls"><button class="fbt" data-act="menu"></button></div></main>';

function load(width: number, htmlClass = ''): void {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', width);
  const style = document.createElement('style');
  style.textContent = SHEETS.map(sheet =>
    readFileSync(join(import.meta.dirname, sheet), 'utf8'),
  ).join('\n');
  document.head.append(style);
  document.documentElement.className = htmlClass;
  document.body.innerHTML = PAGE;
}

const display = (selector: string): string => {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element).display;
};

afterEach(() => {
  Reflect.set(window, 'innerWidth', 1024);
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.documentElement.className = '';
});

describe('the analysis menu', () => {
  it('opens from the controls’ cog from 1020px, and from our tools’ below', () => {
    load(1280);
    expect(display('.analyse__controls > .fbt')).not.toBe('none');
    document.head.innerHTML = '';
    load(390);
    expect(display('.analyse__controls > .fbt')).toBe('none');
  });

  it('shows over the review’s summary, which hides the rest of Lichess’s tools', () => {
    load(1280, 'ln-ext-review ln-ext-review-summary');
    expect(display('.analyse__tools')).toBe('contents');
    expect(display('.ceval')).toBe('none');
    expect(display('.action-menu')).not.toBe('none');
  });

  it('shows "Continue from here"’s links in its place, under the back row', () => {
    load(1280);
    expect(display('.ln-ext-menu-back')).toBe('none');
    const menu = queryOne(document, '.action-menu', HTMLElement);
    if (menu) menu.dataset.lnExtSub = 'continue';
    expect(display('.ln-ext-menu-back')).not.toBe('none');
    expect(display('.action-menu > .title')).toBe('none');
    expect(display('.action-menu__tools')).toBe('none');
    expect(display('.continue-with')).toBe('flex');
  });
});
