import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's flatpickr theme (in a form page's sheet, simul.form.css), and our fields' look.
const LICHESS_RULES = `
  .numInputWrapper span.arrowUp { border-bottom: 0; top: 0; }
  .numInputWrapper span.arrowDown { top: 50%; }`;
const OUR_FIELDS = readFileSync(
  join(import.meta.dirname, '../pages/tabs-tables-forms.css'),
  'utf8',
);
const SHEET = readFileSync(join(import.meta.dirname, 'flatpickr.css'), 'utf8');

const CALENDAR = `<div class="flatpickr-calendar hasTime open"><div class="flatpickr-time">
  <div class="numInputWrapper"><input class="numInput flatpickr-hour" type="number">
  <span class="arrowUp"></span><span class="arrowDown"></span></div></div></div>`;

function styleOf(selector: string): CSSStyleDeclaration {
  const style = document.createElement('style');
  style.textContent = `:root { --ln-ext-input-bg: #222; }${OUR_FIELDS}${SHEET}${LICHESS_RULES}`;
  document.head.append(style);
  document.body.innerHTML = CALENDAR;
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('the date picker', () => {
  // Lichess's rule comes later, as its sheet loads after ours.
  it('stacks its two arrows at the middle, not the top', () => {
    expect(styleOf('.arrowUp').top).toBe('calc(50% - 12px)');
  });

  it('keeps our fields’ box off its hour and year', () => {
    expect(styleOf('input.numInput').backgroundColor).toBe('transparent');
  });
});
