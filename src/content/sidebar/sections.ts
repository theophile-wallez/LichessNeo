import { z } from 'zod/mini';
import { closestTo, queryAll, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { syncWhileParsing } from '#shared/frame.ts';
import { readStored, StorageKey, writeStored } from '#shared/storage.ts';

// In the unfolded sidebar (styles/sidebar/unfolded.css) a section's own link folds
// its pages open or shut instead of leaving the page. The open sections are kept by
// their places ("2 5") and marked as the page parses, so it's drawn with them open.
// Until the first fold nothing is kept, and the page's own section shows open.
// Only a fold animates: the transitions are on while `data-ln-ext-nav-folding` is.

const SECTION = '#topnav > section';
const WIDE = '(min-width: 1020px)';
const FOLDING = 'lnExtNavFolding';
const FOLD_MS = 400;
let settling = 0;

const PlacesSchema = z.string().check(z.regex(/^(\d+( \d+)*)?$/));

const sections = (): HTMLElement[] => queryAll(document, SECTION, HTMLElement);

function storedPlaces(): number[] | null {
  const stored = readStored(StorageKey.navigationOpen, PlacesSchema);
  if (stored === null) return null;
  return stored ? stored.split(' ').map(Number) : [];
}

/** Marks each section open or shut, as kept; none until the first fold. */
function markSections(): void {
  const places = storedPlaces();
  for (const [i, section] of sections().entries())
    setData(section, 'lnExtOpen', places && (places.includes(i + 1) ? 'open' : 'shut'));
}

function fold(section: HTMLElement): void {
  const all = sections();
  const current = all.findIndex(each => each.dataset.lnExtCurrent);
  const open = new Set(storedPlaces() ?? (current < 0 ? [] : [current + 1]));
  const place = all.indexOf(section) + 1;
  if (!open.delete(place)) open.add(place);
  writeStored(
    StorageKey.navigationOpen,
    [...open].toSorted((left, right) => left - right).join(' '),
  );
  const root = document.documentElement;
  setData(root, FOLDING, '');
  markSections();
  // A second fold mid-way keeps the transitions on for its own run.
  window.clearTimeout(settling);
  settling = window.setTimeout(() => setData(root, FOLDING, null), FOLD_MS);
}

function onClick(event: MouseEvent): void {
  if (document.documentElement.dataset.lnExtSidebar !== 'unfolded') return;
  if (!matchMedia(WIDE).matches) return;
  // A middle click, or one with a modifier, still opens the section's page.
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
    return;
  const link = closestTo(event.target, `${SECTION} > a`, HTMLAnchorElement);
  const section = closestTo(link, SECTION, HTMLElement);
  if (!section) return;
  event.preventDefault();
  fold(section);
}

export const sidebarSections: Feature = {
  name: 'sidebar-sections',
  start: () => {
    syncWhileParsing(markSections);
    // Capturing, so the link doesn't navigate first.
    document.addEventListener('click', onClick, true);
  },
};
