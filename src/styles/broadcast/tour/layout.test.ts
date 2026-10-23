import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

const read = (sheet: string): string =>
  readFileSync(join(import.meta.dirname, '..', '..', sheet), 'utf8');

// Lichess's own rules (ui/analyse/css/study/relay/_tour.scss): the pickers lose their position.
const LICHESS_RULES = '.relay-tour__mselect { position: unset; }';

const SHEETS = [
  LICHESS_RULES,
  read('analysis/controls.css'),
  ...['layout', 'header', 'tabs', 'side', 'narrow'].map(part => read(`broadcast/tour/${part}.css`)),
];

// A broadcast's page as Lichess serves it, its games and chat beside the tour.
const PAGE =
  '<div id="main-wrap"><main class="analyse is-relay has-relay-tour">' +
  '<aside class="relay-tour__side"><div class="relay-tour__side__header"></div>' +
  '<div class="relay-games"></div><div class="vertical-resize"></div>' +
  '<section class="mchat" style="flex: 0 0 120px; height: 120px"></section>' +
  '<div class="vertical-resize"><div class="chat__members"></div></div></aside>' +
  '<div class="box relay-tour"><div class="relay-tour__header">' +
  '<div class="relay-tour__header__content"><h1>An event</h1>' +
  '<div class="relay-tour__header__selectors">' +
  '<div class="mselect relay-tour__mselect relay-tour__round-select"></div></div></div>' +
  '<div class="relay-tour__header__image"></div></div>' +
  '<div class="relay-tour__nav"><nav class="relay-tour__tabs"></nav></div>' +
  '<div class="study__multiboard"></div></div></main></div>';

/** The page at a window width, with the analysis layout's flags and ours. */
function render(width: number, flags = 'analyse relay-tour'): void {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', width);
  const style = document.createElement('style');
  style.textContent = SHEETS.join('\n');
  document.head.append(style);
  document.documentElement.dataset['lnExtHas'] = flags;
  document.body.innerHTML = PAGE;
}

const styleOf = (selector: string): CSSStyleDeclaration => {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
};

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  delete document.documentElement.dataset['lnExtHas'];
});

describe('a broadcast’s page', () => {
  // The analysis layout kept it from scrolling: the standings' end was out of reach.
  it('scrolls, where the analysis pages don’t', () => {
    render(1280, 'analyse');
    expect(styleOf('#main-wrap').overflow).toBe('hidden');
    document.head.innerHTML = '';
    render(1280);
    expect(styleOf('#main-wrap').overflow).toBe('hidden auto');
  });

  it('pins its title and, under it, its tabs', () => {
    render(1280);
    expect(styleOf('.relay-tour h1').position).toBe('sticky');
    expect(styleOf('.relay-tour h1').top).toBe('0px');
    expect(styleOf('.relay-tour__nav').position).toBe('sticky');
    expect(styleOf('.relay-tour__nav').top).toBe('64px');
  });

  // Sticky stays in main's content box: main's own padding pushed the side up at the end.
  it('keeps the side put to the page’s end, its room being the tour’s', () => {
    render(1280);
    expect(styleOf('.relay-tour__side').position).toBe('sticky');
    expect(Number.parseFloat(styleOf('main').paddingBottom || '0')).toBe(0);
    expect(styleOf('.relay-tour').paddingBottom).toBe('40px');
  });

  it('ends the side with the chat, taking what the games leave', () => {
    render(1280);
    expect(styleOf('.mchat + .vertical-resize').display).toBe('none');
    expect(styleOf('.mchat').flexGrow).toBe('1');
    expect(styleOf('.mchat').height).toBe('auto');
  });

  // Unset, the round's menu hung from both pickers' box, as wide as it.
  it('hangs each picker’s menu from its own button', () => {
    render(1280);
    expect(styleOf('.relay-tour__mselect').position).toBe('relative');
  });

  it('puts the event before its games and chat below 1020px', () => {
    render(800);
    expect(styleOf('main').display).toBe('flex');
    expect(styleOf('.relay-tour').order).toBe('-1');
    expect(styleOf('.relay-tour h1').position).not.toBe('sticky');
  });
});
