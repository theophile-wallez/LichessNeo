import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { drawer } from './drawer.ts';

// Lichess's header below 1020px: the hamburger's checkbox, and its nav's sections.
const HEADER = `<header id="top"><div class="site-title-nav">
  <input type="checkbox" id="tn-tg">
  <nav id="topnav">
    <section><a href="/">Play</a><div role="group"><a href="/tournament">Arena</a></div></section>
    <section><a href="/training">Puzzles</a><div role="group"><a href="/storm">Storm</a></div></section>
  </nav>
</div></header>`;

let narrow = true;
drawer.start();

beforeEach(() => {
  document.body.innerHTML = HEADER;
  narrow = true;
  vi.stubGlobal('matchMedia', () => ({ matches: narrow }));
});

afterEach(() => vi.unstubAllGlobals());

const sections = (): HTMLElement[] => queryAll(document, '#topnav > section', HTMLElement);
const opened = (): boolean[] =>
  sections().map(section => section.classList.contains('lr-ext-open'));

function tap(index: number): boolean {
  const link = sections()[index]?.querySelector('a');
  return link?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })) ?? true;
}

describe('the drawer', () => {
  it('folds a section open on a tap, one at a time, instead of leaving the page', () => {
    expect(tap(0)).toBe(false);
    expect(opened()).toEqual([true, false]);
    tap(1);
    expect(opened()).toEqual([false, true]);
    tap(1);
    expect(opened()).toEqual([false, false]);
  });

  it("leaves a section's links and the desktop sidebar's alone", () => {
    const arena = document.querySelector('#topnav a[href="/tournament"]');
    expect(arena?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))).toBe(
      true,
    );
    narrow = false;
    expect(tap(0)).toBe(true);
    expect(opened()).toEqual([false, false]);
  });

  it("opens on the page's section", () => {
    document.querySelector('#topnav a[href="/storm"]')?.setAttribute('aria-current', 'page');
    const toggle = document.getElementById('tn-tg');
    if (!(toggle instanceof HTMLInputElement)) throw new Error('no toggle');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    expect(opened()).toEqual([false, true]);
  });
});
