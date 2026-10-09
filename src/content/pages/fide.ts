import { setData, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';

// The FIDE players' and federations' rank (styles/fide/) counts the rows
// on the page, so a list opened on a later page (/fide?page=3) must start
// from that page's first row, and hand out no medals.

const ROWS_PER_PAGE = 30;

/** How many rows the pages before this one hold, or null on a first page. */
export function fideRankOffset(pathname: string, search: string): number | null {
  if (!/\/fide(\/federation)?$/.test(pathname)) return null;
  const page = Number(new URLSearchParams(search).get('page'));
  return page > 1 ? (page - 1) * ROWS_PER_PAGE : null;
}

export const fideOffset: Feature = {
  name: 'FIDE rank offset',
  start: () => {
    const offset = fideRankOffset(location.pathname, location.search);
    if (offset === null) return;
    const root = document.documentElement;
    setData(root, 'lrExtFideSkip', String(offset));
    setStyleProperty(root, '--lr-ext-fide-skip', String(offset));
  },
};
