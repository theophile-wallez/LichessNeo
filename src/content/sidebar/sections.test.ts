import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { sidebarSections } from './sections.ts';

// Lichess's nav, the page's own section marked (content/layout/marks.ts).
const NAV = `<nav id="topnav">
  <section><a href="/">Play</a><div role="group"><a href="/tournament">Arena</a></div></section>
  <section data-ln-ext-current="page"><a href="/training">Puzzles</a><div role="group"><a href="/storm">Storm</a></div></section>
  <section><a href="/learn">Learn</a><div role="group"><a href="/practice">Practice</a></div></section>
</nav>`;

let wide = true;
sidebarSections.start();

beforeEach(() => {
  wide = true;
  vi.stubGlobal('matchMedia', () => ({ matches: wide }));
  document.documentElement.dataset.lnExtSidebar = 'unfolded';
  document.body.innerHTML = NAV;
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  delete document.documentElement.dataset.lnExtSidebar;
  delete document.documentElement.dataset.lnExtNavFolding;
});

const sections = (): HTMLElement[] => queryAll(document, '#topnav > section', HTMLElement);
const marks = (): (string | undefined)[] => sections().map(section => section.dataset.lnExtOpen);

/** Clicks a section's own link; false when the click was kept from leaving the page. */
function click(index: number, init: MouseEventInit = {}): boolean {
  const link = sections()[index]?.querySelector(':scope > a');
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
  return link?.dispatchEvent(event) ?? true;
}

describe('the unfolded sidebar’s sections', () => {
  it('fold open or shut on a click instead of leaving the page, several at once', () => {
    expect(click(0)).toBe(false);
    expect(marks()).toEqual(['open', 'open', 'shut']);
    click(1);
    expect(marks()).toEqual(['open', 'shut', 'shut']);
    click(1);
    expect(marks()).toEqual(['open', 'open', 'shut']);
  });

  it('show the page’s own section open until the first fold, from its place then', () => {
    expect(marks()).toEqual([undefined, undefined, undefined]);
    click(1);
    expect(localStorage.getItem('ln-ext-navigation-open')).toBe('');
    click(2);
    expect(localStorage.getItem('ln-ext-navigation-open')).toBe('3');
  });

  it('stay as they were kept on the next page, marked as it parses', () => {
    localStorage.setItem('ln-ext-navigation-open', '1 3');
    document.body.innerHTML = NAV;
    sidebarSections.start();
    expect(marks()).toEqual(['open', 'shut', 'open']);
  });

  it('animate only while folding', () => {
    click(0);
    expect(document.documentElement.dataset.lnExtNavFolding).toBe('');
  });

  it('still open the section’s page on a click with a modifier or the middle button', () => {
    expect(click(0, { metaKey: true })).toBe(true);
    expect(click(0, { button: 1 })).toBe(true);
    expect(marks()).toEqual([undefined, undefined, undefined]);
  });

  it('leave the links of a section and the other sidebars alone', () => {
    const arena = document.querySelector('#topnav a[href="/tournament"]');
    expect(arena?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))).toBe(
      true,
    );
    document.documentElement.dataset.lnExtSidebar = 'collapsed';
    expect(click(0)).toBe(true);
    document.documentElement.dataset.lnExtSidebar = 'unfolded';
    wide = false;
    expect(click(0)).toBe(true);
  });
});
