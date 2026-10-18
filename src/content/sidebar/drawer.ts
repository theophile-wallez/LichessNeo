import { closestTo, queryAll, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';

// Below 1020px Lichess's nav is a drawer (styles/sidebar/drawer.css): a
// section's own link there folds its links open rather than leaving the page,
// one section at a time, and the drawer opens on the page's section.

const NARROW = '(max-width: 1019.98px)';
const OPEN = 'ln-ext-open';
const SECTION = '#topnav > section';

/** Opens this section of the drawer, and closes the others. */
export function openSection(section: HTMLElement | null): void {
  for (const each of queryAll(document, SECTION, HTMLElement)) {
    each.classList.toggle(OPEN, each === section);
  }
}

function onClick(event: MouseEvent): void {
  if (!matchMedia(NARROW).matches) return;
  const link = closestTo(event.target, `${SECTION} > a`, HTMLAnchorElement);
  const section = closestTo(link, SECTION, HTMLElement);
  if (!section) return;
  event.preventDefault();
  openSection(section.classList.contains(OPEN) ? null : section);
}

function onToggle(event: Event): void {
  const toggle = event.target;
  if (!(toggle instanceof HTMLInputElement) || toggle.id !== 'tn-tg' || !toggle.checked) return;
  const current = queryOne(document, '#topnav a[aria-current]', HTMLAnchorElement);
  openSection(closestTo(current, SECTION, HTMLElement));
}

export const drawer: Feature = {
  name: 'drawer',
  start: () => {
    // Capturing, so the link doesn't navigate first.
    document.addEventListener('click', onClick, true);
    document.addEventListener('change', onToggle);
  },
};
