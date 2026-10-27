import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

const SHEETS = ['stage.css', 'setup.css'];

// happy-dom drops a selector whose `:is()` runs over several lines.
const oneLine = (css: string): string => css.replace(/\s+/g, ' ');

/** A board's piece while the setup intro plays, under Lichess's prefs `prefs`. */
function pieceAnimation(prefs: string | null): string {
  const style = document.createElement('style');
  style.textContent = SHEETS.map(sheet =>
    oneLine(readFileSync(join(import.meta.dirname, sheet), 'utf8')),
  ).join('\n');
  document.head.replaceChildren(style);
  if (prefs === null) delete document.documentElement.dataset.lnExtPrefs;
  else document.documentElement.dataset.lnExtPrefs = prefs;
  document.body.innerHTML =
    '<div id="main-wrap" class="is2d"><main class="round" data-ln-ext-intro="setup">' +
    '<cg-board><piece class="white king"></piece></cg-board></main></div>';
  const piece = queryOne(document, 'piece', HTMLElement);
  if (!piece) throw new Error('no piece');
  // happy-dom answers the shorthand only.
  return getComputedStyle(piece).animation;
}

afterEach(() => {
  document.head.replaceChildren();
  document.body.innerHTML = '';
  delete document.documentElement.dataset.lnExtPrefs;
});

describe('an intro’s pieces', () => {
  it('stay in place in a game whose pieces Lichess doesn’t animate', () => {
    expect(pieceAnimation(null)).toMatch(/^ln-ext-intro-setup-drop /);
    expect(pieceAnimation('coords-in no-animation')).toBe('none');
  });
});
