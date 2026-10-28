import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

afterEach(() => {
  document.head.replaceChildren();
  document.body.innerHTML = '';
});

describe('the bubble’s actions', () => {
  it('stay pinned to the foot of the comment’s scroll', () => {
    const style = document.createElement('style');
    style.textContent = readFileSync(join(import.meta.dirname, 'bubble-parts.css'), 'utf8');
    document.head.replaceChildren(style);
    document.body.innerHTML =
      '<div id="ln-ext-review"><div class="ln-ext-bubble__body"><p class="ln-ext-bubble__sub"></p>' +
      '<div class="ln-ext-bubble__actions"></div></div></div>';
    const actions = queryOne(document, '.ln-ext-bubble__actions', HTMLElement);
    if (!actions) throw new Error('no actions');
    const { position, bottom } = getComputedStyle(actions);
    expect([position, bottom]).toEqual(['sticky', '0px']);
  });
});
