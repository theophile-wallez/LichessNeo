import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { sidebarCollapse } from './collapse.ts';

// The sidebar's widths, unfolded and folded (styles/sidebar/layout.css, collapsed.css, whose
// own tests check them).
const WIDTHS =
  ':root { --ln-ext-sidebar-w: 168px; } ' +
  "html[data-ln-ext-sidebar~='collapsed'] { --ln-ext-sidebar-w: 56px; }";

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => name } });
  const style = document.createElement('style');
  style.textContent = WIDTHS;
  document.head.replaceChildren(style);
  document.body.innerHTML =
    '<header id="top"><a class="site-title" href="/">lichess</a><nav id="topnav"></nav></header>' +
    '<div id="main-wrap"></div>';
  sidebarCollapse.start();
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  document.head.replaceChildren();
  document.body.replaceChildren();
  delete document.documentElement.dataset.lnExtSidebar;
  delete document.documentElement.dataset.lnExtSidebarMoving;
});

function page(): HTMLElement {
  const wrap = queryOne(document, '#main-wrap', HTMLElement);
  if (!wrap) throw new Error('no page');
  return wrap;
}

const toggle = (): void => queryOne(document, '#ln-ext-sidebar-toggle', HTMLElement)?.click();

describe('the sidebar’s fold', () => {
  it('slides the page from where it stood, rather than resizing it frame by frame', () => {
    const slides = vi.spyOn(page(), 'animate');
    toggle();
    expect(document.documentElement.dataset.lnExtSidebar).toBe('collapsed');
    expect(slides.mock.calls[0]?.[0]).toEqual([
      { transform: 'translateX(112px)' },
      { transform: 'none' },
    ]);
    toggle();
    expect(slides.mock.calls[1]?.[0]).toEqual([
      { transform: 'translateX(-112px)' },
      { transform: 'none' },
    ]);
  });

  it('names each flyout after its section, without the hidden "lichess.org" of Play', () => {
    document.body.innerHTML =
      '<header id="top"><a class="site-title" href="/">lichess</a><nav id="topnav"><section>' +
      '<a href="/"><span class="play">Play</span><span class="home">lichess.org</span></a>' +
      '<div role="group"></div></section></nav></header>';
    sidebarCollapse.start();
    expect(queryOne(document, '#topnav section > div', HTMLElement)?.dataset.lnExtLabel).toBe(
      'Play',
    );
  });
});
