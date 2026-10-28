import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

afterEach(() => {
  document.head.replaceChildren();
  document.body.innerHTML = '';
});

describe('the game over’s counts', () => {
  it('break a long name rather than cut its end', () => {
    const style = document.createElement('style');
    style.textContent = readFileSync(join(import.meta.dirname, 'game-end-stats.css'), 'utf8');
    document.head.replaceChildren(style);
    document.body.innerHTML =
      '<div class="ln-ext-end__count"><span class="ln-ext-end__count-label">très bons coups</span></div>';
    const label = queryOne(document, '.ln-ext-end__count-label', HTMLElement);
    if (!label) throw new Error('no label');
    const { whiteSpace, textOverflow } = getComputedStyle(label);
    expect(whiteSpace).not.toBe('nowrap');
    expect(textOverflow).not.toBe('ellipsis');
  });
});
