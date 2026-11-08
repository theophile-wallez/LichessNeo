import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('a finished Swiss’s title', () => {
  // Pinned, it stays once the podium has scrolled away: the podium no longer stands for it.
  it('keeps its picture', () => {
    const style = document.createElement('style');
    style.textContent = readFileSync(join(import.meta.dirname, 'main.css'), 'utf8').replaceAll(
      /\s+/gu,
      ' ',
    );
    document.head.append(style);
    document.body.innerHTML =
      '<main class="swiss"><div class="swiss__main"><div class="box swiss__main-finished">' +
      '<div class="podium-wrap"><div class="swiss__main__header"><icon class="img"></icon>' +
      '<h1>Classical</h1></div></div></div></div></main>';
    const picture = queryOne(document, 'icon.img', HTMLElement);
    if (!picture) throw new Error('no picture');
    expect(getComputedStyle(picture).display).not.toBe('none');
  });
});
