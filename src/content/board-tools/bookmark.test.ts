import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { closestTo, queryOne } from '#shared/dom.ts';
import { syncBoardTools } from './board-tools.ts';

// Lichess's star, as lila's `views.bookmark.toggle` renders it for a signed-in user.
const STAR =
  '<a class="bookmark" href="/bookmark/abcdefgh" title="Bookmark this game">' +
  '<i class="on is3"></i><i class="off is3"></i><span>3</span></a>';
const META = `<div class="game__meta">${STAR}</div>`;
const BOARD = '<div class="round__app__board main-board"><div class="cg-wrap"></div></div>';
const ROUND =
  `<main class="round"><aside class="round__side">${META}</aside><div class="round__app">` +
  `${BOARD}<button class="fbt board-menu-toggle-btn" title="Board menu"></button></div></main>`;
const BOARD_MENU =
  '<div class="board-menu"><section><button class="button">Flip</button></section></div>';
const ANALYSIS =
  `<main class="analyse"><aside class="analyse__side">${META}</aside>` +
  '<div class="analyse__board main-board"><div class="cg-wrap"></div></div>' +
  '<div class="analyse__tools"><div class="action-menu"><div class="action-menu__tools"></div></div></div>' +
  '<div class="analyse__controls"><button class="fbt" data-act="menu"></button></div></main>';

const star = (): HTMLButtonElement | null =>
  queryOne(document, '.ln-ext-board-tools__btn--bookmark', HTMLButtonElement);
const row = (): HTMLButtonElement | null =>
  queryOne(document, '.ln-ext-menu-bookmark', HTMLButtonElement);
const link = (): HTMLAnchorElement | null =>
  queryOne(document, '.game__meta a.bookmark', HTMLAnchorElement);
const pressed = (button: HTMLButtonElement | null): string | null | undefined =>
  button?.getAttribute('aria-pressed');

// Lichess's delegated handler (site/domHandlers.ts): toggles the class, posts, follows nothing.
const posts: string[] = [];
let lichessLive = true;
beforeAll(() => {
  document.body.addEventListener('click', event => {
    const anchor = closestTo(event.target, 'a.bookmark', HTMLAnchorElement);
    if (!anchor || !lichessLive) return;
    anchor.classList.toggle('bookmarked');
    posts.push(anchor.getAttribute('href') ?? '');
    event.preventDefault();
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  posts.length = 0;
  lichessLive = true;
});

describe('bookmark', () => {
  it('adds a star to the board tools, named and pressed as Lichess’s', () => {
    document.body.innerHTML = ROUND;
    syncBoardTools();
    expect(star()?.getAttribute('aria-label')).toBe('Bookmark this game');
    expect(pressed(star())).toBe('false');
    link()?.classList.add('bookmarked');
    syncBoardTools();
    expect(pressed(star())).toBe('true');
    expect(star()?.classList.contains('ln-ext-board-tools__btn--on')).toBe(true);
  });

  it('bookmarks the game through Lichess’s star, and back', () => {
    document.body.innerHTML = ROUND;
    syncBoardTools();
    star()?.click();
    expect(posts).toEqual(['/bookmark/abcdefgh']);
    expect(link()?.classList.contains('bookmarked')).toBe(true);
    expect(pressed(star())).toBe('true');
    star()?.click();
    expect(link()?.classList.contains('bookmarked')).toBe(false);
    expect(pressed(star())).toBe('false');
  });

  it('never follows the star’s link, even before Lichess listens to it', () => {
    lichessLive = false;
    document.body.innerHTML = ROUND;
    syncBoardTools();
    let followed = true;
    document.addEventListener('click', event => (followed = !event.defaultPrevented), {
      once: true,
    });
    star()?.click();
    expect(followed).toBe(false);
  });

  it('adds a row to the game’s board menu once open', () => {
    document.body.innerHTML = ROUND;
    syncBoardTools();
    expect(row()).toBeNull();
    document.querySelector('.round__app')?.insertAdjacentHTML('beforeend', BOARD_MENU);
    syncBoardTools();
    expect(row()?.parentElement?.matches('.board-menu > section')).toBe(true);
    expect(row()?.textContent).toBe('Bookmark this game');
    row()?.click();
    expect(posts).toHaveLength(1);
    expect(pressed(row())).toBe('true');
    expect(pressed(star())).toBe('true');
  });

  it('adds a row to the analysis menu', () => {
    document.body.innerHTML = ANALYSIS;
    syncBoardTools();
    expect(row()?.parentElement?.matches('.action-menu__tools')).toBe(true);
    expect(star()).not.toBeNull();
  });

  it('shows nothing where Lichess has no star to press', () => {
    // Signed out, Lichess shows only the count, in a span.
    const signedOut = ROUND.replace(
      META,
      '<div class="game__meta"><span class="bookmark"></span></div>',
    );
    document.body.innerHTML = signedOut;
    syncBoardTools();
    expect(star()).toBeNull();
    document.body.innerHTML = ROUND;
    syncBoardTools();
    expect(star()).not.toBeNull();
    link()?.remove();
    syncBoardTools();
    expect(star()).toBeNull();
  });
});
