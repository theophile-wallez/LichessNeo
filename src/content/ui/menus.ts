import { closestTo, queryAll } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';

// Lichess closes an open menu through a click-away mask, which sits under the
// menu's bar since we lift that bar over it (dropdowns/mselect.css): the bar's
// other menus and buttons took the click and left the menu open. So a click
// outside a menu closes it; the `change` lets Lichess point its mask at what
// is still open.

function togglesItself(target: EventTarget | null, toggle: HTMLInputElement): boolean {
  if (!(target instanceof Node)) return true;
  if (closestTo(toggle, '.mselect', HTMLElement)?.contains(target) === true) return true;
  // A label for it (Lichess's mask, our setup picks) toggles it on its own.
  return closestTo(target, 'label', HTMLLabelElement)?.control === toggle;
}

export function closeMenusClickedAway(event: MouseEvent): void {
  for (const toggle of queryAll(document, '.mselect__toggle:checked', HTMLInputElement)) {
    if (togglesItself(event.target, toggle)) continue;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

export const menus: Feature = {
  name: 'menus',
  // Capturing, so Lichess sees the menu closed before the click reaches it.
  start: () => document.addEventListener('click', closeMenusClickedAway, true),
};
