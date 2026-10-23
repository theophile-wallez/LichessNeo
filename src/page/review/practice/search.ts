import { queryAll, queryOne } from '#shared/dom.ts';
import type { OpeningLine } from './openings.ts';

// Lichess's own search of its openings (/opening?q=…), which answers a page's
// script with its results' markup alone: a link per opening, to its page and
// its moves (/opening/Caro-Kann_Defense/e4_c6), with its name and a little
// board of its position ("<placement>,<orientation>,<last move>").

/** The openings in the results' markup; one without moves (a family's page) is left out. */
export function parseResults(markup: string): OpeningLine[] {
  const page = new DOMParser().parseFromString(markup, 'text/html');
  return queryAll(page, 'a.opening__search__result', HTMLAnchorElement).flatMap(link => {
    const [, , , moves = ''] = (link.getAttribute('href') ?? '').split('/');
    const name = queryOne(link, '.opening__search__result__title', HTMLElement)?.textContent;
    const state = queryOne(link, '[data-state]', HTMLElement)?.dataset.state ?? '';
    const [placement = '', , lastMove = ''] = state.split(',');
    if (!moves || !name || !placement) return [];
    return [
      { name: name.trim(), moves: moves.split('_').map(decodeURIComponent), placement, lastMove },
    ];
  });
}

/** Asks Lichess for the openings named like `query`. */
export async function searchOpenings(query: string): Promise<OpeningLine[]> {
  const response = await fetch(`/opening?q=${encodeURIComponent(query)}`, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  if (!response.ok) throw new Error(`Opening search: ${response.status}`);
  return parseResults(await response.text());
}
