import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';

/** Takes our marks off <html>. */
function unmark(): void {
  const root = document.documentElement;
  for (const name of root.getAttributeNames())
    if (name.startsWith('data-ln-ext')) root.removeAttribute(name);
}

const SHEETS = [
  'layout.css',
  'nav.css',
  'donate-and-buttons.css',
  'collapsed.css',
  'rail.css',
  'unfolded.css',
];

// Lichess's header, as the sidebar takes it over, with our Donate item.
const HEADER = `<header id="top"><div class="site-title-nav"><nav id="topnav">
  <section><a href="/">Play</a><div role="group"><a href="/tournament">Arena</a></div></section>
  <section><a href="/training">Puzzles</a><div role="group"><a href="/storm">Storm</a></div></section>
</nav></div><a id="ln-ext-donate" href="/patron">Donate</a></header><div id="main-wrap"></div>`;

/**
 * Draws the sidebar in a shape, <html> marked as given: anew each time, as happy-dom keeps
 * an element's computed style when an ancestor's attributes change.
 */
function render(shape: string | null, marks: Record<string, string> = {}): void {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', 1440);
  const style = document.createElement('style');
  style.textContent = SHEETS.map(sheet =>
    readFileSync(join(import.meta.dirname, sheet), 'utf8'),
  ).join('\n');
  document.head.replaceChildren(style);
  unmark();
  const root = document.documentElement;
  if (shape !== null) root.dataset.lnExtSidebar = shape;
  Object.assign(root.dataset, marks);
  document.body.innerHTML = HEADER;
}

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
  unmark();
});

const sidebarWidth = (): string =>
  getComputedStyle(document.documentElement).getPropertyValue('--ln-ext-sidebar-w').trim();

/** A section's pages, the section marked as content/sidebar/sections.ts and marks.ts do. */
function pagesOf(
  index: number,
  marks: { open?: string; current?: boolean } = {},
): CSSStyleDeclaration {
  const section = queryAll(document, '#topnav > section', HTMLElement)[index];
  if (!section) throw new Error('no section');
  if (marks.open) section.dataset.lnExtOpen = marks.open;
  if (marks.current) section.dataset.lnExtCurrent = 'page';
  const pages = queryOne(section, ':scope > div', HTMLElement);
  if (!pages) throw new Error('no pages');
  return getComputedStyle(pages);
}

describe('the sidebar’s shapes', () => {
  it('give each its width', () => {
    const widths = [null, 'collapsed', 'collapsed rail', 'unfolded'].map(shape => {
      render(shape);
      return sidebarWidth();
    });
    expect(widths).toEqual(['168px', '56px', '84px', '240px']);
  });

  it('keep the pages in a flyout outside the unfolded sidebar', () => {
    render(null);
    expect(pagesOf(0, { open: 'open' }).position).toBe('absolute');
  });
});

describe('the unfolded sidebar', () => {
  it('lists an open section’s pages under it, and folds a shut one’s', () => {
    render('unfolded');
    const open = pagesOf(0, { open: 'open' });
    const shut = pagesOf(1, { open: 'shut' });
    expect([open.position, open.height, open.visibility]).toEqual(['static', 'auto', 'visible']);
    expect([shut.height, shut.visibility]).toEqual(['0px', 'hidden']);
  });

  it('opens the page’s own section until the first fold, and keeps it shut after', () => {
    render('unfolded');
    expect(pagesOf(0, { current: true }).visibility).toBe('visible');
    expect(pagesOf(1, { current: true, open: 'shut' }).visibility).toBe('hidden');
  });

  it('animates only a fold, not a page loading or the settings switching to it', () => {
    render('unfolded');
    expect(pagesOf(0, { open: 'open' }).transition).toBe('');
    render('unfolded', { lnExtNavFolding: '' });
    expect(pagesOf(0, { open: 'open' }).transition).toContain('height 0.32s');
    expect(pagesOf(1, { open: 'shut' }).transition).toContain('height 0.3s');
  });
});

/** Donate's overflow in the folded sidebar, <html> marked as given. */
function donateOverflow(marks: Record<string, string>): string {
  render('collapsed', marks);
  const donate = queryOne(document, '#ln-ext-donate', HTMLElement);
  if (!donate) throw new Error('no Donate');
  return getComputedStyle(donate).overflow;
}

describe('the sidebar folding', () => {
  // Not the sidebar's own width transition: happy-dom matches `:is(#top .site-title)` on #top.
  it('leaves the page’s width out of the animation', () => {
    render('collapsed', { lnExtSidebarMoving: '' });
    expect(getComputedStyle(document.documentElement).transition).not.toContain('sidebar-w');
  });

  it('clips Donate’s label as it fades, and lets its tooltip out once folded', () => {
    expect(donateOverflow({ lnExtSidebarMoving: '' })).toBe('hidden');
    expect(donateOverflow({})).toBe('visible');
  });
});
