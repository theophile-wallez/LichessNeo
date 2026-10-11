import { pickCoach } from '#shared/coach.ts';
import { createElement, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { syncWhileParsing } from '#shared/frame.ts';
import { html, setHtml, type SafeHtml } from '#shared/html.ts';
import { chartMarkup } from './chart.ts';
import { startCoach } from './coach.ts';
import { coachTips } from './coach-line.ts';
import { DashboardSchema, overview, type Dashboard } from './data.ts';
import { days } from './format.ts';
import { summaryMarkup } from './summary.ts';

// The puzzle dashboard's overview (/training/dashboard/<days>/dashboard), in
// place of Lichess's tiles and radar: the period's numbers, the coach's tips,
// the themes to work on and the strong ones, then every theme against its
// level. Its numbers are asked for as the script starts, and Lichess's blocks
// hidden until then (`data-lr-ext-pdash` on <html>, styles/dashboard), so a
// load or a change of period never shows them first. If the API can't be
// read, they come back.

const BOX = 'main .page-menu__content.puzzle-dashboard';
// The period's link in Lichess's own picker: it carries the player's name.
const CURRENT = '.box__top .mselect__item.current[href]';
const TABS = [7, 30, 90] as const;
const DAYS_IN = /\/dashboard\/(\d+)\//;
// Without a period, the dashboard shows the last 30 days.
const PAGE = /\/training\/dashboard(?:\/(\d+)\/dashboard)?\/?$/;
const DEFAULT_DAYS = 30;

/** The period a dashboard's address shows, null on any other page. */
export function pageDays(path: string): number | null {
  const found = PAGE.exec(path);
  return found ? Number(found[1] ?? DEFAULT_DAYS) : null;
}

// Only the player's own numbers: the API has no one else's.
function isOwn(href: string): boolean {
  const asked = new URL(href, location.origin).searchParams.get('u');
  return asked === null || asked.toLowerCase() === document.body.dataset.user?.toLowerCase();
}

function tabsMarkup(current: number, href: string): SafeHtml {
  const tabs = TABS.map(count => {
    const link = href.replace(DAYS_IN, `/dashboard/${count}/`);
    return html`<a href="${link}" ${count === current && html`aria-current="page"`}>${days(count)}</a>`;
  });
  return html`${tabs}`;
}

async function fetchDashboard(count: number): Promise<Dashboard | null> {
  const response = await fetch(`/api/puzzle/dashboard/${count}`, {
    headers: { Accept: 'application/json' },
  });
  return response.ok ? (DashboardSchema.safeParse(await response.json()).data ?? null) : null;
}

/** Lichess's blocks show again: the overview won't come. */
const giveUp = (): void => setData(document.documentElement, 'lrExtPdash', null);

function addTabs(box: HTMLElement, count: number, href: string): void {
  const tabs = createElement('nav', { className: 'lr-ext-pdash__days' });
  setHtml(tabs, tabsMarkup(count, href));
  queryOne(box, ':scope > .box__top > .mselect', HTMLElement)?.before(tabs);
}

function addOverview(global: HTMLElement, data: Dashboard): void {
  const view = overview(data);
  const tips = coachTips(view);
  const coachId = pickCoach();
  const replayHref =
    queryOne(global, 'a.puzzle-dashboard__metric--fix[href]', HTMLAnchorElement)?.getAttribute(
      'href',
    ) ?? null;
  const section = createElement('section', { className: 'lr-ext-pdash' });
  setHtml(section, html`${summaryMarkup({ view, tips, coachId, replayHref })}${chartMarkup(view)}`);
  global.after(section);
  startCoach(section, tips, coachId);
  setData(document.documentElement, 'lrExtPdash', 'in');
}

function start(): void {
  const count = pageDays(location.pathname);
  if (count === null) return;
  setData(document.documentElement, 'lrExtPdash', 'loading');
  const asked = fetchDashboard(count).catch(() => null);
  let placed = false;
  syncWhileParsing(() => {
    const box = queryOne(document, BOX, HTMLElement);
    const global = box && queryOne(box, ':scope > .puzzle-dashboard__global', HTMLElement);
    const href = box && queryOne(box, CURRENT, HTMLAnchorElement)?.getAttribute('href');
    if (placed || !box || !global || !href) return;
    placed = true;
    if (!isOwn(href)) return giveUp();
    addTabs(box, count, href);
    void asked.then(data => (data ? addOverview(global, data) : giveUp()));
  });
  // A page without the dashboard's blocks (signed out, Lichess changed it): nothing to hide.
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      if (!placed) giveUp();
    },
    { once: true },
  );
}

export const puzzleDashboard: Feature = { name: 'puzzle dashboard', start };
