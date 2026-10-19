import { createElement, queryOne, setData } from '#shared/dom.ts';
import { html, setHtml, type SafeHtml } from '#shared/html.ts';
import { DashboardSchema, type Dashboard } from './data.ts';
import { days } from './format.ts';

// What the dashboard's three pages share: their address, their numbers, the
// period's tabs, and the mark on <html> that hides Lichess's blocks
// (styles/dashboard) while ours are on their way.

export const BOX = 'main .page-menu__content.puzzle-dashboard';
// The period's link in Lichess's own picker: it carries the player's name.
const CURRENT = '.box__top .mselect__item.current[href]';
const TABS = [7, 30, 90] as const;
const DAYS_IN = /\/dashboard\/(\d+)\//;
// Without a period or a page, the dashboard shows the last 30 days.
const PAGE = /\/training\/dashboard(?:\/(\d+)\/(dashboard|improvementAreas|strengths))?\/?$/;
const DEFAULT_DAYS = 30;

type View = 'dashboard' | 'improvementAreas' | 'strengths';

export interface Shown {
  readonly days: number;
  readonly view: View;
}

const asView = (name: string | undefined): View =>
  name === 'improvementAreas' || name === 'strengths' ? name : 'dashboard';

/** The period and page an address shows, null away from the dashboard. */
export function pageOf(path: string): Shown | null {
  const found = PAGE.exec(path);
  return found ? { days: Number(found[1] ?? DEFAULT_DAYS), view: asView(found[2]) } : null;
}

/** The picked period's link in Lichess's picker, null if it has none (signed out). */
export const currentHref = (box: ParentNode): string | null =>
  queryOne(box, CURRENT, HTMLAnchorElement)?.getAttribute('href') ?? null;

// Only the player's own numbers: the API has no one else's.
export function isOwn(href: string): boolean {
  const asked = new URL(href, location.origin).searchParams.get('u');
  return asked === null || asked.toLowerCase() === document.body.dataset.user?.toLowerCase();
}

export async function fetchDashboard(count: number): Promise<Dashboard | null> {
  const response = await fetch(`/api/puzzle/dashboard/${count}`, {
    headers: { Accept: 'application/json' },
  });
  return response.ok ? (DashboardSchema.safeParse(await response.json()).data ?? null) : null;
}

export const markLoading = (): void => setData(document.documentElement, 'lnExtPdash', 'loading');

export const markIn = (): void => setData(document.documentElement, 'lnExtPdash', 'in');

/** Lichess's blocks show again: ours won't come. */
export const giveUp = (): void => setData(document.documentElement, 'lnExtPdash', null);

function tabsMarkup(current: number, href: string): SafeHtml {
  const tabs = TABS.map(count => {
    const link = href.replace(DAYS_IN, `/dashboard/${count}/`);
    return html`<a href="${link}" ${count === current && html`aria-current="page"`}>${days(count)}</a>`;
  });
  return html`${tabs}`;
}

/** The period's tabs, before Lichess's picker, which stays for the other periods. */
export function addTabs(box: HTMLElement, count: number, href: string): void {
  const tabs = createElement('nav', { className: 'ln-ext-pdash__days' });
  setHtml(tabs, tabsMarkup(count, href));
  queryOne(box, ':scope > .box__top > .mselect', HTMLElement)?.before(tabs);
}
