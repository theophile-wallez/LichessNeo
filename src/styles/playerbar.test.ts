import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { bundleCss } from '#scripts/lib/css-bundle.ts';
import { queryOne } from '#shared/dom.ts';

// Our analysis bar, filled as content/analysis/player-bar.ts fills it.
const BAR =
  '<main class="analyse"><div class="ln-ext-player ln-ext-player--top">' +
  '<a class="user-link" href="/@/someone">someone</a><rating>1834</rating></div></main>';

// A live game's bar, as Lichess serves it on TV: the title ends with a no-break space.
const LIVE_BAR =
  '<main class="round"><div class="round__app"><div class="ruser-top ruser user-link">' +
  '<a class="user-link" href="/@/someone"><span class="utitle">NM\u00a0</span>someone</a>' +
  '<rating>2062</rating></div></div></main>';

function render(markup: string): void {
  const style = document.createElement('style');
  style.textContent = readFileSync(join(import.meta.dirname, 'playerbar.css'), 'utf8');
  document.head.replaceChildren(style);
  document.body.innerHTML = markup;
}

function ratingDisplay(bodyClass: string): string {
  document.body.className = bodyClass;
  render(BAR);
  const rating = queryOne(document, 'rating', HTMLElement);
  if (!rating) throw new Error('no rating');
  return getComputedStyle(rating).display;
}

afterEach(() => {
  document.head.replaceChildren();
  document.body.innerHTML = '';
  document.body.className = '';
});

describe('the player bars', () => {
  // Lichess's own rule hides the ratings of its bars only (ui/round/css/_user.scss).
  it('hide our bars’ ratings where Lichess hides its own', () => {
    expect(ratingDisplay('coords-in')).not.toBe('none');
    expect(ratingDisplay('coords-in no-rating')).toBe('none');
  });

  it('take back the space Lichess puts inside a live game’s title badge', () => {
    render(LIVE_BAR);
    const title = queryOne(document, '.utitle', HTMLElement);
    if (!title) throw new Error('no title');
    expect(Number.parseFloat(getComputedStyle(title).wordSpacing)).toBeLessThan(0);
  });
});

describe('our analysis bar, under every stylesheet', () => {
  // The Packs card's sound player once took its class: its `top: 8px` set the avatar on the
  // board, and its `pointer-events: none` the name out of reach.
  it('takes no rule meant for another part of ours', async () => {
    const css = await bundleCss(join(import.meta.dirname, 'index.css'));
    const sheet = document.createElement('style');
    // happy-dom drops a selector whose `:is()` runs over several lines.
    sheet.textContent = css.replace(/\s+/g, ' ');
    document.head.replaceChildren(sheet);
    document.body.innerHTML = BAR;
    const bar = queryOne(document, '.ln-ext-player', HTMLElement);
    if (!bar) throw new Error('no bar');
    const style = getComputedStyle(bar);
    expect(style.top).not.toMatch(/\d/);
    expect(style.pointerEvents).not.toBe('none');
  });
});
