import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryAll } from '#shared/dom.ts';

// The palette's roles (theme/palette.css), as plain values.
const PALETTE =
  ':root { --ln-ext-text: #c8c8c8; --ln-ext-good: #3cb371; --ln-ext-good-hover: #7fe0a8;' +
  ' --ln-ext-red: #ff6b6b; --ln-ext-red-dark: #c0392b; --ln-ext-white: #fff; }';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('the puzzle’s moves', () => {
  it('mark a right or wrong move in its hue, never in white', () => {
    const style = document.createElement('style');
    style.textContent = PALETTE + readFileSync(join(import.meta.dirname, 'move-list.css'), 'utf8');
    document.head.append(style);
    document.body.innerHTML =
      '<main class="puzzle"><div class="tview2 tview2-column">' +
      '<move class="good"><glyph data-icon=""></glyph>Qg1</move>' +
      '<move class="win"><glyph data-icon=""></glyph>Qxf3</move>' +
      '<move class="fail"><glyph data-icon=""></glyph>Ka1</move>' +
      '<interrupt data-ln-ext-tries=""><lines><line>' +
      '<move class="fail"><glyph data-icon=""></glyph>Kb1</move></line></lines></interrupt>' +
      '</div></main>';
    const marks = queryAll(document, 'glyph', HTMLElement).map(
      glyph => getComputedStyle(glyph).color,
    );
    expect(marks).toEqual(['#7fe0a8', '#7fe0a8', '#ff6b6b', '#ff6b6b']);
  });
});
