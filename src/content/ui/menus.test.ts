import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { menus } from './menus.ts';

// The coaches' bar as Lichess serves it, with a search field as the studies'
// has, and the click-away mask Lichess keeps in <body>.
const menu = (id: string): string => `
  <div class="mselect">
    <input type="checkbox" class="mselect__toggle mselect__toggle--mask fullscreen-toggle" id="mselect-${id}">
    <label for="mselect-${id}" class="mselect__label">${id}</label>
    <nav class="mselect__list"><a class="mselect__item" href="#${id}">${id}</a></nav>
  </div>`;

const PAGE = `
  <div class="box__top">
    <input class="search" type="text">
    <div class="box__top__actions">${menu('lang')}${menu('country')}${menu('sort')}</div>
  </div>
  <label id="mselect-fullscreen-mask" class="fullscreen-mask mselect__fullscreen-mask"></label>`;

const element = (selector: string): HTMLElement => {
  const found = queryOne(document, selector, HTMLElement);
  if (!found) throw new Error(`No ${selector}`);
  return found;
};

const open = (): string[] =>
  queryAll(document, '.mselect__toggle:checked', HTMLInputElement).map(toggle => toggle.id);

// Lichess's own listener: its mask toggles the menu that is open.
function pointMask(event: Event): void {
  const mask = element('.mselect__fullscreen-mask');
  const checked = queryOne(document, '.mselect__toggle--mask:checked', HTMLInputElement);
  if (event.target instanceof HTMLInputElement && checked) mask.setAttribute('for', checked.id);
  else mask.removeAttribute('for');
}

beforeAll(() => {
  menus.start();
  document.body.addEventListener('change', pointMask);
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('an open menu', () => {
  it('closes when another menu of its bar opens', () => {
    document.body.innerHTML = PAGE;
    element('[for=mselect-lang]').click();
    element('[for=mselect-country]').click();
    expect(open()).toEqual(['mselect-country']);
    expect(element('.mselect__fullscreen-mask').getAttribute('for')).toBe('mselect-country');
  });

  it("closes when the bar's other controls are clicked", () => {
    document.body.innerHTML = PAGE;
    element('[for=mselect-sort]').click();
    element('.search').click();
    expect(open()).toEqual([]);
    expect(element('.mselect__fullscreen-mask').hasAttribute('for')).toBe(false);
  });

  it('stays open while its own list is clicked', () => {
    document.body.innerHTML = PAGE;
    element('[for=mselect-lang]').click();
    element('[href="#lang"]').click();
    expect(open()).toEqual(['mselect-lang']);
  });

  it('closes on a click of a label for it outside the menu, as the setup tiles are', () => {
    document.body.innerHTML = `<label class="ln-ext-setup__tile" for="mselect-lang"></label>${PAGE}`;
    element('.ln-ext-setup__tile').click();
    expect(open()).toEqual(['mselect-lang']);
    element('.ln-ext-setup__tile').click();
    expect(open()).toEqual([]);
  });

  it('closes on a click of its button or of the mask, as Lichess has it', () => {
    document.body.innerHTML = PAGE;
    element('[for=mselect-lang]').click();
    element('[for=mselect-lang]').click();
    expect(open()).toEqual([]);
    element('[for=mselect-lang]').click();
    element('.mselect__fullscreen-mask').click();
    expect(open()).toEqual([]);
  });
});
