import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { cssPixels, type Viewport } from '#shared/testing/css-math.ts';

// The panel's top row holds the coach's card at a fixed height: with no coach the card is
// 40px shorter, and the row left that much empty under the review's buttons.

const VIEWPORT: Viewport = { width: 1600, height: 900 };

const oneLine = (css: string): string => css.replace(/\s+/g, ' ');

function render(mode: string, coach: string, theory = false): HTMLElement {
  Reflect.set(window, 'innerWidth', VIEWPORT.width);
  const style = document.createElement('style');
  style.textContent = ['layout.css', 'coach.css', 'bubble.css']
    .map(sheet => oneLine(readFileSync(join(import.meta.dirname, sheet), 'utf8')))
    .join('\n');
  document.head.append(style);
  const root = document.documentElement;
  root.className = `ln-ext-review ln-ext-review-${mode}`;
  root.dataset.lnExtCoach = coach;
  if (theory) root.dataset.lnExtTheory = 'on';
  document.body.innerHTML =
    '<main class="analyse" style="--ln-ext-stage: 800px">' +
    '<div id="ln-ext-review"><div class="ln-ext-coach"></div></div></main>';
  const main = queryOne(document, 'main.analyse', HTMLElement);
  if (!main) throw new Error('no analysis page');
  return main;
}

const top = (mode: string, coach: string): number =>
  cssPixels(
    getComputedStyle(render(mode, coach)).getPropertyValue('--ln-ext-review-top'),
    VIEWPORT,
  );

function cardHeight(coach: string): number {
  render('moves', coach, true);
  const card = queryOne(document, '.ln-ext-coach', HTMLElement);
  if (!card) throw new Error('no card');
  return cssPixels(getComputedStyle(card).height, VIEWPORT);
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  const root = document.documentElement;
  root.className = '';
  delete root.dataset.lnExtCoach;
  delete root.dataset.lnExtTheory;
  Reflect.set(window, 'innerWidth', 1024);
});

describe('the review’s top row with no coach', () => {
  it('shrinks by what the card loses, move by move and on the free board', () => {
    for (const mode of ['moves', 'live']) {
      expect(top(mode, '3') - top(mode, 'none')).toBe(40);
    }
  });

  it('still grows the card on a move of opening theory', () => {
    expect(cardHeight('3') - cardHeight('none')).toBe(40);
    expect(cardHeight('none')).toBeGreaterThan(96);
  });
});
