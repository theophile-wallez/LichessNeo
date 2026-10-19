import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's own rule (ui/round/css/_meta.scss): the star pinned over the line's end.
const LICHESS_RULE = '.game__meta .bookmark { position: absolute; right: 0; }';

const META =
  '<main class="round"><div class="round__side"><div class="game__meta">' +
  '<section><div class="game__meta__infos" data-icon=""><div class="header">' +
  '<div class="setup"><a class="bookmark"><i class="on"></i><i class="off"></i></a>' +
  '<span class="ln-ext-part">∞</span><span class="ln-ext-part">Casual</span></div>' +
  '<time class="timeago">4 minutes ago</time>' +
  '</div></div></section></div></div></main>';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('the game info', () => {
  it('puts the bookmark star in the line, before the time', () => {
    const style = document.createElement('style');
    style.textContent =
      LICHESS_RULE + readFileSync(join(import.meta.dirname, 'game-info.css'), 'utf8');
    document.head.append(style);
    document.body.innerHTML = META;
    const bookmark = queryOne(document, '.bookmark', HTMLElement);
    const time = queryOne(document, 'time', HTMLElement);
    if (!bookmark || !time) throw new Error('no bookmark or time');
    expect(getComputedStyle(bookmark).position).toBe('static');
    expect(Number(getComputedStyle(bookmark).order)).toBeLessThan(
      Number(getComputedStyle(time).order),
    );
  });
});
