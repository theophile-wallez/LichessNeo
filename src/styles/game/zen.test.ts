import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

const SHEETS = ['zen.css', 'board-extras.css', 'layout-narrow.css'];

const ROUND =
  '<main class="round"><rm6><l4x></l4x><div class="result-wrap"></div><bo3></bo3></rm6>' +
  '<div class="rclock rclock-turn"></div>' +
  '<div class="ln-ext-board-tools ln-ext-board-tools--hover">' +
  '<button class="ln-ext-board-tools__btn ln-ext-board-tools__btn--zen"></button></div></main>';

function styled(selector: string): CSSStyleDeclaration {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
}

function load(bodyClass: string, width = 1280): void {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', width);
  const style = document.createElement('style');
  style.textContent = SHEETS.map(sheet =>
    readFileSync(join(import.meta.dirname, sheet), 'utf8'),
  ).join('\n');
  document.head.append(style);
  document.body.className = bodyClass;
  document.body.innerHTML = ROUND;
}

afterEach(() => {
  Reflect.set(window, 'innerWidth', 1024);
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.body.className = '';
  delete document.documentElement.dataset.lnExtHas;
});

describe('Zen', () => {
  it('hides the "Your turn" of a game with no clock, alone under the controls there', () => {
    load('zenable');
    expect(styled('.rclock-turn').display).not.toBe('none');
    document.body.classList.add('zen');
    expect(styled('.rclock-turn').display).toBe('none');
  });

  it('hides the result in the moves while the game over’s card says it', () => {
    load('zenable zen');
    expect(styled('.result-wrap').display).not.toBe('none');
    document.documentElement.dataset.lnExtHas = 'round round-end-card';
    expect(styled('.result-wrap').display).toBe('none');
  });

  it('has a button on the board only in a game the user plays', () => {
    load('');
    expect(styled('.ln-ext-board-tools__btn--zen').display).toBe('none');
    document.body.className = 'zenable';
    expect(styled('.ln-ext-board-tools__btn--zen').display).not.toBe('none');
  });

  it('leaves its button room in a phone’s row of move buttons, not beside a tablet’s board', () => {
    load('zenable', 390);
    expect(styled('bo3').paddingInlineEnd).not.toBe('8px');
    document.head.innerHTML = '';
    load('zenable', 820);
    expect(styled('bo3').paddingInlineEnd).toBe('8px');
  });
});
