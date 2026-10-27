import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// happy-dom computes no pseudo-element, drops `mask` and a selector over several lines: each
// `::before` becomes a child standing in for it, raising every rule's specificity alike, `mask` a
// custom property, which cascades, and each run of white space one space.
function stylesheet(...paths: string[]): string {
  return paths
    .map(path => readFileSync(join(import.meta.dirname, path), 'utf8'))
    .join('\n')
    .replaceAll(/\s+/gu, ' ')
    .replaceAll('::before', ' > .before')
    .replaceAll(/\bmask:/gu, '--mask:');
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('the forum index’s title', () => {
  it('shows the forum picture whole, unmasked by its glyph’s Hugeicon', () => {
    const style = document.createElement('style');
    style.textContent = stylesheet(
      '../theme/hugeicons/glyphs.css',
      '../theme/hugeicons/paint.css',
      'page.css',
    );
    document.head.append(style);
    document.body.innerHTML =
      '<main class="box forum index"><div class="box__top">' +
      '<h1 class="text" data-icon="\ue042"><span class="before"></span>Lichess Forum</h1>' +
      '</div></main>';
    const picture = queryOne(document, 'h1 > .before', HTMLElement);
    if (!picture) throw new Error('no picture');
    expect(getComputedStyle(picture).getPropertyValue('--mask')).toBe('none');
  });
});
