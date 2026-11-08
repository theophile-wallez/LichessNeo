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

describe('the forum’s box', () => {
  it('drops Lichess’s clip, which cut the back button’s hover shift on the new topic form', () => {
    const style = document.createElement('style');
    style.textContent = `.box { overflow: hidden; } ${stylesheet('page.css')}`;
    document.head.append(style);
    document.body.innerHTML =
      '<main class="box forum forum-topic topic-form"><div class="box__top">' +
      '<h1><a href="/forum/game-analysis" data-icon=""></a>Game Analysis</h1>' +
      '</div></main>';
    const box = queryOne(document, 'main', HTMLElement);
    if (!box) throw new Error('no box');
    expect(getComputedStyle(box).overflow).toBe('visible');
  });
});

describe('the back button', () => {
  // A button that slides on hover leaves a cursor on its edge, which then loses the hover,
  // and the button slides back under it, over and over.
  it('stays put on hover, and slides only its chevron', () => {
    const style = document.createElement('style');
    style.textContent = stylesheet('page.css');
    document.head.append(style);
    const hovers = [...(style.sheet?.cssRules ?? [])]
      .filter(rule => rule instanceof CSSStyleRule)
      .filter(rule => rule.selectorText.includes('a[data-icon]:first-child:hover'));
    const moved = (suffix: string): string[] =>
      hovers
        .filter(rule => rule.selectorText.split(',').some(part => part.trim().endsWith(suffix)))
        .map(rule => rule.style.getPropertyValue('transform'))
        .filter(transform => transform !== '');
    expect(moved(':first-child:hover')).toEqual([]);
    expect(moved(':first-child:hover > .before')).toEqual(['translateX(-3px)']);
  });
});

describe('the forum index’s pinned title', () => {
  // Signed in, the teams' forums run the index past the window: its title stays put.
  it('sticks on a desktop, its first title only', () => {
    Reflect.set(window, 'innerWidth', 1366);
    const style = document.createElement('style');
    style.textContent = stylesheet('page.css', 'sticky-title.css');
    document.head.append(style);
    document.body.innerHTML =
      '<main class="box forum index"><div class="box__top"><h1>Lichess Forum</h1></div>' +
      '<table class="categs"></table><div class="box__top"><h1>Team forums</h1></div></main>';
    const [title, teams] = document.querySelectorAll('.box__top');
    if (!title || !teams) throw new Error('no titles');
    expect(getComputedStyle(title).position).toBe('sticky');
    expect(getComputedStyle(teams).position).not.toBe('sticky');
  });
});
