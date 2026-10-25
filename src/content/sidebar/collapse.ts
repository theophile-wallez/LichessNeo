import { createElement, onDomReady, queryAll, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { StorageKey, writeStored } from '#shared/storage.ts';
import { message } from '#content/platform/runtime.ts';
import { isCollapsed, showNavigation } from './navigation.ts';

// The sidebar folds to its icons (styles/sidebar/collapsed.css). The choice is
// kept and read at document_start, so a page never shows the other width first.
// Folded, or in the header's narrow widths, a section's flyout is all that names
// it: it gets the section's label.

const TOGGLE_ID = 'ln-ext-sidebar-toggle';

function show(collapsed: boolean): void {
  showNavigation();
  const toggle = document.getElementById(TOGGLE_ID);
  if (!toggle) return;
  const label = message(collapsed ? 'sidebarExpand' : 'sidebarCollapse');
  toggle.title = label;
  toggle.setAttribute('aria-label', label);
  toggle.setAttribute('aria-expanded', String(!collapsed));
}

// The width animates only on a toggle, never as a page loads: the transition
// is on while this mark is.
const MOVING = 'lnExtSidebarMoving';
const MOVE_MS = 400;
// The sidebar's width transition (styles/sidebar/collapsed.css), which the page follows.
const SLIDE: KeyframeAnimationOptions = { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };
let settling = 0;

const sidebarWidth = (): number =>
  Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--ln-ext-sidebar-w'),
  );

/**
 * The page takes its new width at once, then slides from where it stood as a transform,
 * its edge along the sidebar's: laying it out on every frame of the fold made it stutter.
 */
function slidePage(from: number): void {
  const wrap = document.getElementById('main-wrap');
  if (!wrap) return;
  // A fold mid-way starts from where the last one has the page, and takes over from it.
  const shift = new DOMMatrixReadOnly(getComputedStyle(wrap).transform).m41;
  const offset = from + shift - sidebarWidth();
  wrap.animate([{ transform: `translateX(${offset}px)` }, { transform: 'none' }], SLIDE);
}

function toggle(): void {
  const collapsed = !isCollapsed();
  writeStored(StorageKey.sidebarCollapsed, collapsed ? '1' : '0');
  const root = document.documentElement;
  const from = sidebarWidth();
  setData(root, MOVING, '');
  show(collapsed);
  slidePage(from);
  // A second click mid-way keeps the transition on for its own run.
  window.clearTimeout(settling);
  settling = window.setTimeout(() => {
    setData(root, MOVING, null);
    // The board moved without changing size: chessground keeps its old bounds, and a drag
    // would pick the square beside, until a scroll or a window resize clears them.
    document.dispatchEvent(new Event('scroll'));
  }, MOVE_MS);
}

/** A section's name, as its link says it: Play's link adds "lichess.org", hidden. */
export const sectionName = (link: HTMLAnchorElement): string =>
  (queryOne(link, '.play', HTMLElement) ?? link).textContent.trim();

/** Adds the toggle after the logo, and each section's label to its flyout. */
function dressSidebar(): void {
  const title = queryOne(document, '#top .site-title', HTMLElement);
  if (!title || document.getElementById(TOGGLE_ID)) return;
  const button = createElement('button', { id: TOGGLE_ID, attrs: { type: 'button' } });
  button.addEventListener('click', toggle);
  title.after(button);
  for (const section of queryAll(document, '#topnav section', HTMLElement)) {
    const link = queryOne(section, ':scope > a', HTMLAnchorElement);
    const flyout = queryOne(section, ':scope > div', HTMLElement);
    if (link && flyout) setData(flyout, 'lnExtLabel', sectionName(link));
  }
  const donate = document.getElementById('ln-ext-donate');
  if (donate) setData(donate, 'lnExtLabel', donate.textContent.trim());
  show(isCollapsed());
}

export const sidebarCollapse: Feature = {
  name: 'sidebar-collapse',
  start: () => onDomReady(dressSidebar),
};
