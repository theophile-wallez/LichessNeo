import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryAll } from '#shared/dom.ts';

// The palette's roles (theme/palette.css), as plain values.
const PALETTE =
  ':root { --ln-ext-good: #3cb371; --ln-ext-good-hover: #7fe0a8; --ln-ext-red: #ff6b6b;' +
  ' --ln-ext-red-dark: #c0392b; }';
// Lichess's own (ui/puzzle/css/_session.scss): white on the verdict's hue.
const LICHESS_CHIPS =
  '.puzzle__session a.result-true { background: #629924; color: #fff; }' +
  '.puzzle__session a.result-false { background: #cc3333; color: #fff; }';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('the session’s chips', () => {
  it('write the verdict in its hue rather than white on it', () => {
    const style = document.createElement('style');
    style.textContent =
      PALETTE + LICHESS_CHIPS + readFileSync(join(import.meta.dirname, 'themes.css'), 'utf8');
    document.head.append(style);
    document.body.innerHTML =
      '<main class="puzzle"><div class="puzzle__session">' +
      '<a class="result-true"></a><a class="result-false"></a></div></main>';
    const colors = queryAll(document, '.puzzle__session a', HTMLElement).map(
      chip => getComputedStyle(chip).color,
    );
    expect(colors).toEqual(['#7fe0a8', '#ff6b6b']);
  });
});
