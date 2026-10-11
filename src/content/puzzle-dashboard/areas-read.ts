import { queryAll, queryOne } from '#shared/dom.ts';
import { themeResult, type Dashboard, type ThemeResult } from './data.ts';

// The improvement areas' and strengths' themes: Lichess's own list and order,
// with each theme's description and replay link, and its numbers from the API,
// which has the puzzles' level the page leaves out.

export interface AreaTheme {
  readonly result: ThemeResult;
  readonly description: string;
  /** Lichess's link to the theme's failed puzzles, null when there are none. */
  readonly replayHref: string | null;
}

// A theme's link is its training page: its last segment is its key.
const keyOf = (href: string): string => href.split(/[?#]/)[0]?.split('/').pop() ?? '';

/** The page's themes the API knows, in the page's order. */
export function readAreas(box: ParentNode, data: Dashboard): AreaTheme[] {
  return queryAll(box, ':scope > .puzzle-dashboard__theme', HTMLElement).flatMap(theme => {
    const key = keyOf(queryOne(theme, 'h3 a[href]', HTMLAnchorElement)?.getAttribute('href') ?? '');
    const entry = data.themes[key];
    if (!entry) return [];
    const replay = queryOne(theme, 'a.puzzle-dashboard__metric--fix[href]', HTMLAnchorElement);
    return [
      {
        result: themeResult(key, entry),
        description:
          queryOne(
            theme,
            '.puzzle-dashboard__theme__description',
            HTMLElement,
          )?.textContent.trim() ?? '',
        replayHref: replay?.getAttribute('href') ?? null,
      },
    ];
  });
}
