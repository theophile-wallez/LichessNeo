import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's box: the panel's color, its padding's variable, and its clip from 799.3px (site.css).
const LICHESS =
  ':root { ---box-padding: 50px; } .box { background: rgb(22, 21, 18); overflow: hidden; }' +
  ' .box-pad { padding: 4vh var(---box-padding); }';

const sheet = (name: string): string =>
  readFileSync(join(import.meta.dirname, name), 'utf8').replaceAll(/\s+/gu, ' ');

function render(markup: string, width = 1366): void {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', width);
  const style = document.createElement('style');
  style.textContent = [LICHESS, sheet('page-boxes.css')].join('\n');
  document.head.append(style);
  document.body.innerHTML = markup;
}

function styleOf(selector: string): CSSStyleDeclaration {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

const PAGES = [
  { name: 'a page that is the box', markup: '<main class="box box-pad"><p>Text</p></main>' },
  {
    name: 'a box in a page',
    markup: '<main class="page-small"><div class="box box-pad"><p>Text</p></div></main>',
  },
  {
    name: 'a side menu’s content',
    markup:
      '<main class="page-menu"><aside class="subnav"></aside>' +
      '<div class="page-menu__content box box-pad"><p>Text</p></div></main>',
  },
  {
    name: 'a box in a side menu’s content',
    markup:
      '<main class="page-menu"><aside class="subnav"></aside>' +
      '<div class="page-menu__content"><div class="box box-pad"><p>Text</p></div></div></main>',
  },
];

describe.each(PAGES)('$name', ({ markup }) => {
  it('stands on the page, its sides gone on a desktop', () => {
    render(markup);
    expect(styleOf('.box').backgroundColor).not.toBe('rgb(22, 21, 18)');
    expect(styleOf('.box').paddingLeft).toBe('0px');
    expect(styleOf('.box').overflow).toBe('clip');
  });

  it('keeps its sides as the page’s margins below 1020px', () => {
    render(markup, 820);
    expect(styleOf('.box').backgroundColor).not.toBe('rgb(22, 21, 18)');
    expect(styleOf('.box').paddingLeft).toBe('50px');
  });
});

describe('a card within a page', () => {
  it('keeps its own box', () => {
    render('<main class="page-small"><div class="ready"><div class="box">Card</div></div></main>');
    expect(styleOf('.box').backgroundColor).toBe('rgb(22, 21, 18)');
  });

  it('leaves the settings to their own sheet (account-pinned.css)', () => {
    render('<main class="account page-menu"><div class="page-menu__content box">Form</div></main>');
    expect(styleOf('.box').backgroundColor).toBe('rgb(22, 21, 18)');
  });
});
