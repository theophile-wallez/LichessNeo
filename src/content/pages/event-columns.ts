import { queryAll } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// A Swiss's, an arena's and a simul's page (styles/swiss-show/, styles/event-columns.css):
// from 1260px the page doesn't scroll, only its middle column does. Page keys act on the
// focused scroller, so the column takes the focus once, unless something else has it. An
// arena and a simul are drawn by snabbdom, which may drop the attribute: it's set again.

const COLUMNS = 'main.swiss .swiss__main, main.tour .tour__main, main.simul .simul__main';

export function syncColumnFocus(): void {
  if (!matchMedia('(min-width: 1260px)').matches) return;
  for (const column of queryAll(document, COLUMNS, HTMLElement)) {
    if (column.hasAttribute('tabindex')) continue;
    column.tabIndex = -1;
    if (document.activeElement === document.body) column.focus({ preventScroll: true });
  }
}

export const eventColumns: Feature = {
  name: 'event columns',
  start: () => onEveryTick('event columns', syncColumnFocus),
};
