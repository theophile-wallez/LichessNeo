import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

const SHEETS = ['donate-and-buttons.css', 'account-rating.css', 'collapsed.css'];

const ACCOUNT =
  '<header id="top"><div class="site-buttons"><div class="dasher">' +
  '<button id="user_tag" class="toggle link">Ada</button></div></div></header>';

/** The account's button in the folded sidebar, with a rating shown or none. */
function accountTag(perf?: string, windowHeight = 900): CSSStyleDeclaration {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', 1440);
  Reflect.set(window, 'innerHeight', windowHeight);
  const style = document.createElement('style');
  style.textContent = SHEETS.map(sheet =>
    readFileSync(join(import.meta.dirname, sheet), 'utf8'),
  ).join('\n');
  document.head.replaceChildren(style);
  const root = document.documentElement;
  root.dataset.lnExtSidebar = 'collapsed';
  if (perf) root.dataset.lnExtAccountPerf = perf;
  document.body.innerHTML = ACCOUNT;
  const tag = queryOne(document, '#user_tag', HTMLElement);
  if (!tag) throw new Error('no account button');
  return getComputedStyle(tag);
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  delete document.documentElement.dataset.lnExtSidebar;
  delete document.documentElement.dataset.lnExtAccountPerf;
});

describe('the folded sidebar’s account', () => {
  it('stacks the avatar over the rating, the hidden name taking no line', () => {
    const tag = accountTag('rapid');
    expect(tag.flexDirection).toBe('column');
    expect(tag.height).toBe('52px');
    // Lichess's buttons' 30px line would squeeze the avatar.
    expect(tag.lineHeight).toBe('0');
  });

  it('shrinks on a low window, so the buttons under it still fit', () => {
    expect(accountTag('rapid', 640).height).toBe('42px');
  });

  it('keeps the avatar alone without a rating', () => {
    expect(accountTag().height).toBe('40px');
  });
});
