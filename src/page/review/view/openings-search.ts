import { createElement, queryOne } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { searchOpenings } from '#page/review/practice/search.ts';
import type { Session } from '#page/review/session.ts';
import { svgIcon } from './markup.ts';
import { keptPart } from './openings-kept.ts';

// The practice page's search of Lichess's openings, as the user types.

/** A search waits for the user to stop typing this long, to ask once. */
const TYPING_MS = 300;
/** Shorter queries find too much to be of use. */
const MIN_QUERY = 3;

let typing: number | undefined;

async function search(session: Session, query: string): Promise<void> {
  const setup = session.view.openings;
  try {
    const results = await searchOpenings(query);
    if (setup.query !== query) return;
    setup.results = results;
    setup.searchFailed = false;
  } catch {
    if (setup.query === query) setup.searchFailed = true;
  }
  if (setup.query === query) setup.searching = false;
  session.redraw(true);
}

function onInput(session: Session, input: HTMLInputElement): void {
  const setup = session.view.openings;
  const query = input.value.trim();
  window.clearTimeout(typing);
  setup.query = query;
  setup.searchFailed = false;
  setup.searching = query.length >= MIN_QUERY;
  if (!setup.searching) setup.results = null;
  else typing = window.setTimeout(() => void search(session, query), TYPING_MS);
  session.redraw(true);
}

/** The search field, kept across the page's renders, its placeholder in the page's language. */
export function searchField(session: Session): HTMLElement {
  const label = keptPart(session, 'search', () => {
    const made = createElement('label', { className: 'ln-ext-openings__search' });
    setHtml(
      made,
      html`${svgIcon('search')}<input type="search" autocomplete="off" spellcheck="false">`,
    );
    const input = queryOne(made, 'input', HTMLInputElement);
    input?.addEventListener('input', () => onInput(session, input));
    return made;
  });
  const input = queryOne(label, 'input', HTMLInputElement);
  const placeholder = session.language.ui.practice.page.search;
  if (input && input.placeholder !== placeholder) input.placeholder = placeholder;
  return label;
}
