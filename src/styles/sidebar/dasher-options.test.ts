import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's own rule for every input (ui/lib/css/base/_form.scss).
const LICHESS_RULE = 'input { border: 1px solid #404040; padding: 0.6em 1em; }';

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

describe('the sliders', () => {
  it('draw no box around their track, wherever they stand', () => {
    const style = document.createElement('style');
    style.textContent =
      LICHESS_RULE + readFileSync(join(import.meta.dirname, 'dasher-options.css'), 'utf8');
    document.head.append(style);
    document.body.innerHTML =
      '<div class="ln-ext-roundness"><input type="range" class="ln-ext-src-slider"></div>';
    const slider = queryOne(document, '.ln-ext-src-slider', HTMLInputElement);
    if (!slider) throw new Error('no slider');
    expect(getComputedStyle(slider).borderTopStyle).toBe('none');
    expect(getComputedStyle(slider).paddingLeft).toBe('0px');
  });
});
