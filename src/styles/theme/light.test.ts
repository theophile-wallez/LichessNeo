import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// The light scheme's own roles (base.css), over the palette's steps (palette.css).
const SHEETS = [
  'palette.css',
  'base.css',
  '../pages/tabs-tables-forms.css',
  '../pages/dialogs.css',
];

// happy-dom computes no oklch(): each step, in either scheme, becomes a color that names it,
// step 6 being #000006.
const STEPS = Array.from({ length: 14 }, (_, i) => {
  const hex = (i + 1).toString(16).padStart(2, '0');
  return `--ln-ext-neutral-${i + 1}: #0000${hex};`;
});
const MARKERS = `:root { ${STEPS.join(' ')} } :root.light { ${STEPS.join(' ')} }`;
const step = (number: number): string => `#0000${number.toString(16).padStart(2, '0')}`;

type Scheme = 'light' | 'dark';

/** An element of ours, styled by the theme in a scheme, as Lichess's `<html>` class sets it. */
function render(scheme: Scheme, markup: string): HTMLElement {
  const style = document.createElement('style');
  style.textContent = [
    ...SHEETS.map(sheet => readFileSync(join(import.meta.dirname, sheet), 'utf8')),
    MARKERS,
  ].join('\n');
  document.head.append(style);
  document.documentElement.className = scheme === 'light' ? 'light' : 'dark';
  document.body.innerHTML = markup;
  const element = queryOne(document.body, '*', HTMLElement);
  if (!element) throw new Error('nothing rendered');
  return element;
}

const role = (scheme: Scheme, name: string): string => {
  render(scheme, '<div></div>');
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.documentElement.className = '';
});

describe('the light scheme', () => {
  it('puts white panels on a grey page', () => {
    expect(role('light', '--ln-ext-bg-panel')).toBe(role('light', '--ln-ext-neutral-1'));
    expect(role('light', '--ln-ext-bg-page')).toBe(role('light', '--ln-ext-neutral-5'));
  });

  it('leaves the dark scheme’s panels a step darker than its page', () => {
    expect(role('dark', '--ln-ext-bg-panel')).toBe(role('dark', '--ln-ext-neutral-3'));
    expect(role('dark', '--ln-ext-bg-page')).toBe(role('dark', '--ln-ext-neutral-4'));
  });

  it('fills text fields white, edged darker than the page', () => {
    const field = getComputedStyle(render('light', '<input type="text">'));
    expect(field.backgroundColor).toBe(step(1));
    expect(field.borderTopColor).toBe(step(8));
  });

  it('keeps the dark scheme’s grey fields', () => {
    const field = getComputedStyle(render('dark', '<input type="text">'));
    expect(field.backgroundColor).toBe(step(6));
    expect(field.borderTopColor).toBe(step(7));
  });

  // Dark's shadows, even at half strength, read as black on white.
  it('drops a soft shadow under what floats, and no ring under menus', () => {
    expect(role('light', '--ln-ext-menu-shadow')).toBe(role('light', '--ln-ext-float-shadow'));
    expect(role('light', '--ln-ext-menu-shadow')).not.toContain('0 0 0 1px');
    const dialog = getComputedStyle(render('light', '<dialog open></dialog>'));
    expect(dialog.boxShadow).toContain('32px');
  });

  // `initial` leaves the role invalid, so a browser takes each var()'s fallback: happy-dom
  // reads the word as it is.
  it('lets each floating thing keep its own shadow on dark', () => {
    expect(role('dark', '--ln-ext-float-shadow')).toBe('initial');
  });
});
