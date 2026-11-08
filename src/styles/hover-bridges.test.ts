import { join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { bundleCss } from '#scripts/lib/css-bundle.ts';
import { cssRules, selectorsOf } from '#shared/testing/stylesheets.ts';

// What moves on hover moves out from under a cursor on its trailing edge, which then
// loses the hover: it moves back under the cursor, and round it goes. A pseudo-element
// that only the hover draws, over the strip it leaves (a "bridge"), keeps the hover.

// The last compound of a selector, after its last combinator outside parentheses.
function lastCompound(selector: string): string {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < selector.length; i++) {
    const character = selector[i];
    if (character === '(') depth++;
    else if (character === ')') depth--;
    else if (depth === 0 && /[\s>+~]/u.test(character ?? '')) start = i + 1;
  }
  return selector.slice(start);
}

const OWN_HOVER = /:hover(?![^(]*\))/u;

function moves(rule: CSSStyleRule): boolean {
  const translate = rule.style.getPropertyValue('translate');
  return (
    rule.style.getPropertyValue('transform').includes('translate') ||
    (translate !== '' && translate !== 'none')
  );
}

// The selectors whose hovered element is the one that moves, not a child of it.
function movers(rules: readonly CSSStyleRule[]): string[] {
  return rules
    .filter(moves)
    .flatMap(rule => selectorsOf(rule.selectorText))
    .filter(selector => {
      const last = lastCompound(selector);
      return OWN_HOVER.test(last) && !last.includes('::');
    });
}

// A pseudo-element placed by its edges: the element's own, or a child's that covers it.
function bridges(rules: readonly CSSStyleRule[]): string[] {
  const placed = ['inset', 'top', 'right', 'bottom', 'left'];
  return rules
    .filter(rule => placed.some(property => rule.style.getPropertyValue(property) !== ''))
    .flatMap(rule => selectorsOf(rule.selectorText))
    .filter(selector => /::(?:after|before)$/u.test(selector));
}

let css = '';

beforeAll(async () => {
  css = await bundleCss(join(import.meta.dirname, 'index.css'));
});

afterEach(() => {
  document.head.replaceChildren();
});

describe('what moves on hover', () => {
  it('keeps a bridge over the strip it leaves', () => {
    const rules = cssRules(css).filter(rule => rule instanceof CSSStyleRule);
    const moving = movers(rules);
    const bridged = bridges(rules);
    const unbridged = moving.filter(
      selector =>
        !bridged.some(
          bridge =>
            bridge === `${selector}::after` ||
            bridge === `${selector}::before` ||
            bridge.startsWith(`${selector} `),
        ),
    );

    expect(moving.length).toBeGreaterThan(30);
    expect(unbridged).toEqual([]);
  });
});
