import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// The player bars' room on a game's analysis board. It has to be reserved from the first
// paint: the board is sized from it, so a bar that only counts once our own bars are in had
// the board drawn 112px too tall, then shrink a moment later.

const SHEETS = ['layout.css', 'layout-narrow.css'];

// happy-dom drops a selector whose `:is()` runs over several lines, which is how the
// formatter writes these. Neither sheet holds a string, so the whitespace can go.
const oneLine = (css: string): string => css.replace(/\s+/g, ' ');

/** The page, with the game info Lichess serves it with, under the flags `has` names. */
function render(has: string, width: number): HTMLElement {
  Reflect.set(window, 'innerWidth', width);
  const style = document.createElement('style');
  style.textContent = SHEETS.map(sheet =>
    oneLine(readFileSync(join(import.meta.dirname, sheet), 'utf8')),
  ).join('\n');
  document.head.append(style);
  document.documentElement.dataset['lnExtHas'] = has;
  document.body.innerHTML =
    '<main class="analyse"><div class="analyse__board"><div class="cg-wrap">' +
    '<cg-container></cg-container></div></div>' +
    '<div class="game__meta"><div class="game__meta__players"></div></div></main>';
  const main = queryOne(document, 'main.analyse', HTMLElement);
  if (!main) throw new Error('no analysis page');
  return main;
}

const bar = (has: string, width = 1280): string =>
  getComputedStyle(render(has, width)).getPropertyValue('--ln-ext-bar');

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  Reflect.deleteProperty(document.documentElement.dataset, 'lnExtHas');
});

describe('the analysis board’s player bars', () => {
  it('take their room from Lichess’s own game info, before our bars are in', () => {
    expect(bar('analyse analyse-game')).toBe('56px');
  });

  it('keep it once our bars are in', () => {
    expect(bar('analyse analyse-game analyse-players analyse-captured')).toBe('56px');
  });

  it('take none on a board without players', () => {
    expect(bar('analyse')).toBe('0px');
  });

  it('stay thin for the captured pieces of a board that is not a game', () => {
    expect(bar('analyse analyse-captured')).toBe('28px');
  });

  it('are not thinned by the captured pieces of a game', () => {
    expect(bar('analyse analyse-game analyse-captured')).toBe('56px');
  });

  it('leave a practice lesson alone', () => {
    expect(bar('analyse analyse-game practice')).toBe('0px');
  });

  it('take the same room on a phone', () => {
    expect(bar('analyse analyse-game', 390)).toBe('56px');
    expect(bar('analyse', 390)).toBe('0px');
  });
});
