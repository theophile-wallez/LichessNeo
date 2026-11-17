import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's 70px spinner rule in site.css, which ours overrides inside header dropdowns.
// happy-dom computes no pseudo-element: `::before` becomes a `.before` child standing in for it.
const LICHESS_SPINNER = '.spinner { width: 70px; height: 70px; margin: auto; }';

const DROPDOWN_INITIATING = `<div id="top"><div id="dasher_app" class="dropdown">
  <div class="initiating"><div class="spinner"><span class="before"></span><svg viewBox="0 0 40 40"></svg></div></div>
</div></div>`;

const style = (selector: string): CSSStyleDeclaration => {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
};

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

describe('header dropdowns while initiating', () => {
  it('hides Lichess’s 70px SVG logo spinner and draws a 18px ring in its place', () => {
    const sheet = document.createElement('style');
    sheet.textContent = [
      LICHESS_SPINNER,
      readFileSync(join(import.meta.dirname, 'dropdowns.css'), 'utf8'),
    ]
      .join('\n')
      .replaceAll(/::?before/gu, ' > .before');
    document.head.append(sheet);
    document.body.innerHTML = DROPDOWN_INITIATING;

    const svg = queryOne(document, '#dasher_app .initiating .spinner svg', SVGElement);
    if (!svg) throw new Error('no svg');
    expect(getComputedStyle(svg).display).toBe('none');
    expect(style('#dasher_app .initiating .spinner').width).toBe('22px');
    expect(style('#dasher_app .initiating .spinner > .before').width).toBe('18px');
    expect(style('#dasher_app .initiating .spinner > .before').borderRadius).toBe('50%');
  });
});
