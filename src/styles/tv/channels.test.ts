import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

const STYLES = join(import.meta.dirname, '..');
const SHEETS = ['tv/channels.css', 'tv/column.css', 'tv/row.css', 'pages/static-pages.css'];

const CHANNELS =
  '<aside class="subnav"><nav class="subnav__inner">' +
  '<a class="tv-channel best active"><span><span><strong>Top Rated</strong>' +
  '<span class="champion">Bob<rating> 2900</rating></span></span></span></a>' +
  '</nav></aside>';

// The current games' page as Lichess serves it, its channels TV's own markup.
const GAMES =
  `<main class="page-menu tv-games"><aside class="page-menu__menu">${CHANNELS}</aside>` +
  '<div class="page-menu__content now-playing"></div></main>';

const TV = `<main class="round tv-single"><div class="round__side">${CHANNELS}</div></main>`;

function render(markup: string, width: number): CSSStyleDeclaration {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', width);
  Reflect.set(window, 'innerHeight', 768);
  const style = document.createElement('style');
  style.textContent = SHEETS.map(sheet => readFileSync(join(STYLES, sheet), 'utf8')).join('\n');
  document.head.replaceChildren(style);
  document.body.innerHTML = markup;
  const main = queryOne(document, 'main', HTMLElement);
  if (!main) throw new Error('no main');
  return getComputedStyle(main);
}

function styleOf(selector: string): CSSStyleDeclaration {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
}

function ruleOf(selectorEnd: string): CSSStyleDeclaration {
  const rules = Array.from(document.styleSheets, sheet => Array.from(sheet.cssRules)).flat();
  const nested = rules.flatMap(rule =>
    rule instanceof CSSMediaRule ? Array.from(rule.cssRules) : rule,
  );
  const found = nested.find(
    rule => rule instanceof CSSStyleRule && rule.selectorText.endsWith(selectorEnd),
  );
  if (!(found instanceof CSSStyleRule)) throw new Error(`no ${selectorEnd}`);
  return found.style;
}

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

describe('The current games’ channels on a desktop', () => {
  it('draws them as TV does, not in Lichess’s capitals', () => {
    render(GAMES, 1366);

    expect(styleOf('strong').textTransform).toBe('none');
  });

  // TV's column has the grid's height to fill; the menu has none, and a list based at 0
  // collapsed the card to its border.
  it('sizes the card to its list, where TV’s fills the column', () => {
    render(GAMES, 1366);
    expect(styleOf('.subnav__inner').flexBasis).toBe('auto');

    render(TV, 1366);
    expect(styleOf('.subnav__inner').flexBasis).toBe('0px');
  });

  // The dot is 10px with its border: a 14px ring from the same corner sat 2px off its center.
  // happy-dom styles no pseudo-element, hence the rules themselves.
  it('pulses the live dot from its center', () => {
    render(GAMES, 1366);
    const dot = ruleOf('.tv-channel.active::after');
    const ring = ruleOf('.tv-channel.active > span::after');

    for (const property of ['top', 'inset-inline-start', 'width', 'height']) {
      expect(ring.getPropertyValue(property)).toBe(dot.getPropertyValue(property));
    }
  });

  it('leaves TV’s gap between the menu and the games', () => {
    expect(render(GAMES, 1366).columnGap).toBe('24px');
  });

  // Stuck at #main-wrap's 16px padding, 16px in from the window's edge as TV's column is.
  it('keeps the menu put at the window’s top room', () => {
    render(GAMES, 1366);
    const menu = styleOf('.page-menu__menu');

    expect(menu.position).toBe('sticky');
    expect(menu.top).toBe('0px');
    expect(menu.maxHeight).toBe('calc(100dvh - 32px)');
  });
});

describe('The current games’ channels below 1020px', () => {
  // From 800px Lichess keeps the menu beside the games, as wide as the row of pills.
  it('puts the row over the games, in one column', () => {
    const main = render(GAMES, 900);

    expect(main.gridTemplateColumns).toBe('minmax(0, 1fr)');
    expect(main.gridTemplateAreas).toBe("'menu' 'content'");
  });
});
