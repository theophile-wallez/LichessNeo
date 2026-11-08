import { afterEach, describe, expect, it } from 'vitest';
import { syncMenuPageTitles } from './menu-page-titles.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

const TOPICS =
  '<main class="page-menu"><aside class="subnav"><a href="/blog/community">Community</a>' +
  '<a class="active" href="/blog/topic">By topic</a></aside>' +
  '<div class="page-menu__content box ublog-index"><div class="ublog-topics"></div></div></main>';

const GAMES =
  '<main class="page-menu tv-games"><aside class="page-menu__menu"><aside class="subnav">' +
  '<a href="/games/best" class="tv-channel best active"><span data-icon=""><span>' +
  '<strong>Top Rated</strong><span class="champion">GM iamstraw</span></span></span></a>' +
  '</aside></aside><div class="page-menu__content now-playing"><a class="mini-game"></a></div></main>';

const titles = (): string[] =>
  [...document.querySelectorAll('.box__top h1')].map(title => title.textContent);

describe('syncMenuPageTitles', () => {
  it('titles the blog’s topics with the open link’s label, first in the content', () => {
    document.body.innerHTML = TOPICS;
    syncMenuPageTitles();
    expect(titles()).toEqual(['By topic']);
    expect(document.querySelector('.ublog-index')?.firstElementChild?.className).toBe(
      'box__top ln-ext-menu-page-title',
    );
  });

  it('titles the current games with the channel’s name alone, not its champion', () => {
    document.body.innerHTML = GAMES;
    syncMenuPageTitles();
    expect(titles()).toEqual(['Top Rated']);
  });

  it('adds it once, and leaves a page that has a title of its own', () => {
    document.body.innerHTML = TOPICS;
    syncMenuPageTitles();
    syncMenuPageTitles();
    expect(titles()).toEqual(['By topic']);
    document.body.innerHTML = TOPICS.replace(
      '<div class="ublog-topics">',
      '<div class="box__top"><h1>Community blogs</h1></div><div class="ublog-topics">',
    );
    syncMenuPageTitles();
    expect(titles()).toEqual(['Community blogs']);
  });
});
