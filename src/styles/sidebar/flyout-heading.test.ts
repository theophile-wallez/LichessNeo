import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's transparent background hangs a blur layer in each flyout's ::before (site.css).
// happy-dom computes no pseudo-element: each becomes a child standing in for it, raising every
// rule's specificity alike, and each run of white space one space.
const LICHESS_TRANSPARENT =
  ':where(html.transp) #topnav div:before { content: ""; z-index: -1;' +
  ' backdrop-filter: blur(6px); width: 100%; height: 100%; position: absolute; top: 0; left: 0 }';

const NAV =
  '<header id="top"><nav id="topnav"><section><a href="/training">Puzzles</a>' +
  '<div data-ln-ext-label="Puzzles"><span class="before"></span><a href="/training">Puzzles</a></div></section></nav></header>';

/** The heading of a flyout, in the nav's `shape`, under Lichess's transparent background. */
function heading(shape: string, width: number): CSSStyleDeclaration {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', width);
  const style = document.createElement('style');
  style.textContent = [
    LICHESS_TRANSPARENT,
    ...['collapsed.css', 'header.css'].map(sheet =>
      readFileSync(join(import.meta.dirname, sheet), 'utf8'),
    ),
  ]
    .join('\n')
    .replaceAll(/\s+/gu, ' ')
    .replaceAll(/::?before/gu, ' > .before');
  document.head.replaceChildren(style);
  document.documentElement.classList.add('transp');
  document.documentElement.dataset.lnExtSidebar = shape;
  document.body.innerHTML = NAV;
  const label = queryOne(document, '#topnav section > div > .before', HTMLElement);
  if (!label) throw new Error('no heading');
  return getComputedStyle(label);
}

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
  document.documentElement.classList.remove('transp');
  delete document.documentElement.dataset.lnExtSidebar;
});

describe('a flyout’s heading', () => {
  it.each([
    ['collapsed', 1440],
    ['collapsed rail', 1440],
    ['header', 1200],
  ])('stays above the links in the %s nav, out of Lichess’s blur layer', (shape, width) => {
    const style = heading(shape, width);
    expect(style.display).toBe('block');
    expect(style.position).toBe('static');
    expect(style.width).toBe('auto');
    expect(style.height).toBe('auto');
  });
});
