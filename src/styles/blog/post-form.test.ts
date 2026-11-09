import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's own rules (bits.ublog.form.css).
const LICHESS_RULES = `
.ublog-post-form__main .form-split, .ublog-post-form__main > .form-group { padding-left: 30px; padding-right: 30px; }
.ublog-post-form .etiquette-and-image { display: flex; gap: 2em; }
.ublog-post-form .etiquette-and-image fieldset { flex: 1 1 auto; min-width: 300px; }`;

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

function render(): void {
  const style = document.createElement('style');
  style.textContent =
    LICHESS_RULES + readFileSync(join(import.meta.dirname, 'post-form.css'), 'utf8');
  document.head.append(style);
  document.body.innerHTML =
    '<main class="page-menu"><div class="page-menu__content box ublog-post-form">' +
    '<form class="form3 ublog-post-form__main"><div class="form-group etiquette-and-image">' +
    '<fieldset class="toggle-box"><legend>Etiquette</legend></fieldset>' +
    '<fieldset class="toggle-box"><legend>Cover image</legend></fieldset></div>' +
    '<div class="form-split"><div class="form-group form-half"></div></div>' +
    '</form></div></main>';
}

const element = (selector: string): HTMLElement => {
  const found = queryOne(document, selector, HTMLElement);
  if (!found) throw new Error(`no ${selector}`);
  return found;
};

describe('the blog post form', () => {
  it('lays its fields on the card’s own padding, not Lichess’s inset', () => {
    render();
    expect(getComputedStyle(element('.etiquette-and-image')).paddingLeft).toBe('0px');
    expect(getComputedStyle(element('.form-split')).paddingRight).toBe('0px');
  });

  it('wraps its two tiles where both don’t fit, none past the card', () => {
    render();
    expect(getComputedStyle(element('.etiquette-and-image')).flexWrap).toBe('wrap');
    expect(getComputedStyle(element('.etiquette-and-image > fieldset')).minWidth).toBe(
      'min(300px, 100%)',
    );
  });
});
