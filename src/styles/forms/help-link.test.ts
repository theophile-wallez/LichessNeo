import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

const sheet = (name: string): string => readFileSync(join(import.meta.dirname, name), 'utf8');

// An arena's form once content/form-help has copied its tips into the title.
const ARENA =
  '<main class="page-small"><div class="tour__form box">' +
  '<h1 class="box__top">Create a new tournament<a class="ln-ext-form-help" href="/tournament/help">Our tips</a></h1>' +
  '<form class="form3"><div class="form-group" data-ln-ext-help="title"><a class="text" data-icon="" href="/tournament/help">Our tips</a></div>' +
  '<div class="form-actions"><a href="/tournament">Cancel</a><button class="button" data-icon="">Create</button></div>' +
  '</form></div></main>';

// Lichess's own look for the cancel link: a bare link.
const LICHESS_RULE = '.form3 .form-actions a { display: inline; padding: 0; }';

afterEach(() => {
  Reflect.set(window, 'innerWidth', 1024);
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

function render(width: number): void {
  // happy-dom's setter, which its media queries follow (the DOM's types say it's read-only).
  Reflect.set(window, 'innerWidth', width);
  const style = document.createElement('style');
  style.textContent = LICHESS_RULE + sheet('help-link.css') + sheet('actions.css');
  document.head.append(style);
  document.body.innerHTML = ARENA;
}

const element = (selector: string): HTMLElement => {
  const found = queryOne(document, selector, HTMLElement);
  if (!found) throw new Error(`no ${selector}`);
  return found;
};

describe('a page form’s help link', () => {
  it('shows in the title on a desktop', () => {
    render(1020);
    expect(getComputedStyle(element('.ln-ext-form-help')).display).toBe('inline-flex');
  });

  it('stays in the form below, where the title needs the whole width', () => {
    render(1019);
    expect(getComputedStyle(element('.ln-ext-form-help')).display).toBe('none');
  });
});

describe('a page form’s buttons', () => {
  it('draw Cancel as a button as tall as the one that submits', () => {
    render(1020);
    const cancel = getComputedStyle(element('.form-actions > a'));
    expect(cancel.display).toBe('inline-flex');
    expect(cancel.paddingLeft).toBe('20px');
    expect(cancel.height).toBe(getComputedStyle(element('.form-actions > .button')).height);
  });
});
