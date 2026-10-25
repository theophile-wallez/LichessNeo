import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actionEntries, pageEntries } from './entries.ts';

// Lichess's nav as it serves it, Play's link with its hidden "lichess.org".
const NAV = `<header id="top"><nav id="topnav">
  <section><a href="/"><span class="play">Play</span><span class="home">lichess.org</span></a>
    <div role="group"><a href="/tournament">Arena tournaments</a>
      <a class="community-patron" href="/patron">Donate</a></div></section>
  <section><a href="/training">Puzzles</a>
    <div role="group"><a href="/training">Puzzles</a><a href="/storm">Puzzle Storm</a></div>
  </section></nav><div class="site-buttons"></div></header>`;

// styles/sidebar/nav.css's pictures, and its Donate hidden for ours.
const SHEET = `#topnav section:nth-of-type(1) > a { --ln-ext-nav-icon: url('play.webp'); }
  #topnav div a[href$='/tournament'] { --ln-ext-sub-icon: url('arena.webp'); }
  #topnav div a.community-patron { display: none; }`;

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => name } });
  const style = document.createElement('style');
  style.textContent = SHEET;
  document.head.replaceChildren(style);
  document.body.innerHTML = NAV;
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.head.replaceChildren();
  document.body.replaceChildren();
  delete document.body.dataset.user;
});

describe('the palette’s pages', () => {
  it('lists each section and its pages once, under the section’s name', () => {
    const pages = pageEntries().map(({ label, detail }) => [label, detail]);
    expect(pages).toEqual([
      ['Play', 'Play'],
      ['Arena tournaments', 'Play'],
      ['Puzzles', 'Puzzles'],
      ['Puzzle Storm', 'Puzzles'],
    ]);
  });

  it('draws each with its sidebar picture, else its section’s', () => {
    const [play, arena] = pageEntries();
    expect(play?.icon).toEqual({ kind: 'picture', url: "url('play.webp')" });
    expect(arena?.icon).toEqual({ kind: 'picture', url: "url('arena.webp')" });
  });
});

describe('the palette’s actions', () => {
  it('offers the profile and the preferences only to a signed-in player', () => {
    expect(actionEntries().map(entry => entry.label)).not.toContain('paletteMyProfile');
    document.body.dataset.user = 'eresy';
    document
      .querySelector('.site-buttons')
      ?.insertAdjacentHTML('beforeend', '<a id="user_tag">Eresy</a>');
    const actions = actionEntries();
    expect(actions.find(entry => entry.label === 'paletteMyProfile')?.href).toBe('/@/eresy');
    expect(actions.map(entry => entry.label)).toContain('preferencesButton');
  });

  it('keeps the settings’ pages out of the list until something is typed', () => {
    const settings = actionEntries().filter(entry => entry.detail === 'settingsLink');
    expect(settings.length).toBeGreaterThan(0);
    expect(settings.every(entry => entry.searchOnly)).toBe(true);
  });
});
