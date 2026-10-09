import { afterEach, describe, expect, it } from 'vitest';
import {
  applyOptions,
  closestTo,
  createCustomElement,
  createElement,
  onDomReady,
  queryAll,
  queryOne,
  setData,
  setDataText,
  setStyleProperty,
} from './dom.ts';
import { createOwnedElement } from './owned-element.ts';
import { createSvgElement } from './svg.ts';
import { setReadyState } from './testing/ready-state.ts';

/** How many attribute writes `change` makes on `element`. */
function writesOf(element: Element, change: () => void): number {
  const observer = new MutationObserver(() => {});
  observer.observe(element, { attributes: true });
  change();
  const records = observer.takeRecords();
  observer.disconnect();
  return records.length;
}

afterEach(() => {
  setReadyState('complete');
  document.body.replaceChildren();
});

describe('lookups', () => {
  it('narrow by type, and skip what isn’t of it', () => {
    document.body.innerHTML = '<p class="a"><span class="a">x</span></p><svg class="a"></svg>';
    expect(queryOne(document, '.a', HTMLSpanElement)?.tagName).toBeUndefined();
    expect(queryOne(document, '.a', HTMLParagraphElement)?.tagName).toBe('P');
    expect(queryAll(document, '.a', HTMLElement)).toHaveLength(2);
    const span = document.querySelector('span');
    expect(closestTo(span, 'p', HTMLParagraphElement)?.tagName).toBe('P');
    expect(closestTo(span, 'p', HTMLSpanElement)).toBeNull();
    expect(closestTo(window, 'p', HTMLElement)).toBeNull();
  });
});

describe('createElement', () => {
  it('sets the class, the id, the text, then the attributes', () => {
    const link = createElement('a', {
      className: 'lr-ext-x',
      id: 'lr-ext-y',
      text: '<b>',
      attrs: { href: '/z' },
    });
    expect(link.outerHTML).toBe('<a class="lr-ext-x" id="lr-ext-y" href="/z">&lt;b&gt;</a>');
  });

  it('builds a tag of the type it names', () => {
    expect(createElement('a')).toBeInstanceOf(HTMLAnchorElement);
    expect(createElement('main')).toBeInstanceOf(HTMLElement);
  });
});

describe('createCustomElement', () => {
  it('builds a tag lib.dom doesn’t know, with the same options', () => {
    const rating = createCustomElement('rating', { className: 'lr-ext-x', text: '1500' });
    expect(rating).toBeInstanceOf(HTMLElement);
    expect(rating.tagName).toBe('RATING');
    expect(rating.outerHTML).toBe('<rating class="lr-ext-x">1500</rating>');
    const piece = createCustomElement('piece', { attrs: { 'data-x': '1' } });
    expect(piece.outerHTML).toBe('<piece data-x="1"></piece>');
  });
});

describe('applyOptions', () => {
  it('returns the element it was given, with nothing set for no options', () => {
    const element = document.createElement('span');
    expect(applyOptions(element)).toBe(element);
    expect(element.outerHTML).toBe('<span></span>');
  });
});

describe('setData', () => {
  it('writes only a change, and removes for null', () => {
    const element = createElement('div');
    expect(writesOf(element, () => setData(element, 'lrExtX', 'a'))).toBe(1);
    expect(writesOf(element, () => setData(element, 'lrExtX', 'a'))).toBe(0);
    expect(writesOf(element, () => setData(element, 'lrExtX', null))).toBe(1);
    expect(writesOf(element, () => setData(element, 'lrExtX', null))).toBe(0);
    expect(element.outerHTML).toBe('<div></div>');
  });
});

describe('setDataText', () => {
  it('reads a missing attribute as empty: an empty value clears, but doesn’t add', () => {
    const element = createElement('div');
    expect(writesOf(element, () => setDataText(element, 'lrExtFlag', ''))).toBe(0);
    setDataText(element, 'lrExtFlag', '🇫🇷');
    expect(element.dataset.lrExtFlag).toBe('🇫🇷');
    setDataText(element, 'lrExtFlag', '');
    expect(element.outerHTML).toBe('<div data-lr-ext-flag=""></div>');
  });
});

describe('setStyleProperty', () => {
  it('writes only a change, on HTML and SVG elements alike', () => {
    for (const element of [createElement('div'), createSvgElement('path')]) {
      expect(writesOf(element, () => setStyleProperty(element, '--lr-ext-x', '1px'))).toBe(1);
      expect(writesOf(element, () => setStyleProperty(element, '--lr-ext-x', '1px'))).toBe(0);
      expect(element.style.getPropertyValue('--lr-ext-x')).toBe('1px');
      setStyleProperty(element, '--lr-ext-x', null);
      expect(writesOf(element, () => setStyleProperty(element, '--lr-ext-x', null))).toBe(0);
      expect(element.style.getPropertyValue('--lr-ext-x')).toBe('');
    }
  });
});

describe('onDomReady', () => {
  it('runs at once on a parsed page, else at DOMContentLoaded', () => {
    const calls: string[] = [];
    onDomReady(() => calls.push('parsed'));
    setReadyState('loading');
    onDomReady(() => calls.push('loading'));
    expect(calls).toEqual(['parsed']);
    document.dispatchEvent(new Event('DOMContentLoaded'));
    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(calls).toEqual(['parsed', 'loading']);
  });
});

describe('createOwnedElement', () => {
  it('keeps one element at the end of its container, and builds another for a new one', () => {
    const own = createOwnedElement(() => createElement('div', { className: 'lr-ext-owned' }));
    const first = createElement('main');
    first.append(createElement('p'));
    const made = own(first);
    expect(made.isNew).toBe(true);
    expect(first.lastElementChild).toBe(made.element);
    expect(own(first)).toEqual({ element: made.element, isNew: false });
    const second = createElement('main');
    const remade = own(second);
    expect(remade.isNew).toBe(true);
    expect(remade.element).not.toBe(made.element);
    expect(first.querySelectorAll('.lr-ext-owned')).toHaveLength(1);
    expect(own(first).isNew).toBe(true);
  });
});
