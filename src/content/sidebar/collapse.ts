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
let settling = 0;

function toggle(): void {
  const collapsed = !isCollapsed();
  writeStored(StorageKey.sidebarCollapsed, collapsed ? '1' : '0');
  const root = document.documentElement;
  setData(root, MOVING, '');
  show(collapsed);
  // A second click mid-way keeps the transition on for its own run.
  window.clearTimeout(settling);
  settling = window.setTimeout(() => {
    setData(root, MOVING, null);
    // The board moved without changing size: chessground keeps its old bounds, and a drag
    // would pick the square beside, until a scroll or a window resize clears them.
    document.dispatchEvent(new Event('scroll'));
  }, MOVE_MS);
}

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
    if (link && flyout) setData(flyout, 'lnExtLabel', link.textContent.trim());
  }
  const donate = document.getElementById('ln-ext-donate');
  if (donate) setData(donate, 'lnExtLabel', donate.textContent.trim());
  show(isCollapsed());
}

export const sidebarCollapse: Feature = {
  name: 'sidebar-collapse',
  start: () => onDomReady(dressSidebar),
};
