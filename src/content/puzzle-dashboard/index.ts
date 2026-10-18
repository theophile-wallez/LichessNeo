import { pickCoach } from '#shared/coach.ts';
import { createElement, onDomReady, queryAll, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { syncWhileParsing } from '#shared/frame.ts';
import { html, setHtml } from '#shared/html.ts';
import { readAreas } from './areas-read.ts';
import { areasMarkup } from './areas-view.ts';
import { chartMarkup } from './chart.ts';
import { liveMascot, startCoach } from './coach.ts';
import { coachTips } from './coach-line.ts';
import { overview, type Dashboard } from './data.ts';
import {
  addTabs,
  BOX,
  currentHref,
  fetchDashboard,
  giveUp,
  isOwn,
  markIn,
  markLoading,
  pageOf,
  type Shown,
} from './page.ts';
import { summaryMarkup } from './summary.ts';

// The puzzle dashboard's pages, in place of Lichess's blocks. The dashboard
// (/training/dashboard/<days>/dashboard): the period's numbers, the coach's
// tips, the themes to work on and the strong ones, every theme against its
// level. The improvement areas and strengths: the first theme in a card with
// the player's mascot, the others in a list. Their numbers are asked for as
// the script starts, and Lichess's blocks hidden until then, so a load or a
// change of period never shows them first. If the API can't be read, they
// come back.

function addOverview(global: HTMLElement, data: Dashboard): void {
  const view = overview(data);
  const tips = coachTips(view);
  const coachId = pickCoach();
  const replayHref =
    queryOne(global, 'a.puzzle-dashboard__metric--fix[href]', HTMLAnchorElement)?.getAttribute(
      'href',
    ) ?? null;
  const section = createElement('section', { className: 'ln-ext-pdash' });
  setHtml(section, html`${summaryMarkup({ view, tips, coachId, replayHref })}${chartMarkup(view)}`);
  global.after(section);
  startCoach(section, tips, coachId);
  markIn();
}

function addAreas(box: HTMLElement, data: Dashboard, shown: Shown): void {
  const themes = readAreas(box, data);
  const last = queryAll(box, ':scope > .puzzle-dashboard__theme', HTMLElement).at(-1);
  if (themes.length === 0 || !last) return giveUp();
  const kind = shown.view === 'strengths' ? 'strong' : 'weak';
  const coachId = pickCoach();
  const section = createElement('section', {
    className: 'ln-ext-pdash ln-ext-pdash--areas',
    attrs: { 'data-ln-ext-areas': kind },
  });
  setHtml(section, areasMarkup(themes, kind, coachId));
  last.after(section);
  const mascot = queryOne(section, '.ln-ext-pdash__mascot', HTMLElement);
  if (mascot) liveMascot(mascot, coachId, () => (kind === 'strong' ? 'happy' : 'doubt'));
  markIn();
}

/** Runs `place` once on the page's box, if it's the player's own dashboard. */
function whenOwn(place: (box: HTMLElement, href: string) => boolean): void {
  let placed = false;
  const tryPlace = (): void => {
    const box = queryOne(document, BOX, HTMLElement);
    const href = box && currentHref(box);
    if (placed || !box || !href) return;
    if (isOwn(href)) placed = place(box, href);
    else {
      placed = true;
      giveUp();
    }
  };
  syncWhileParsing(tryPlace);
  // A page without the dashboard's blocks (signed out, Lichess changed it): nothing to hide.
  onDomReady(() => {
    tryPlace();
    if (!placed) giveUp();
  });
}

function start(): void {
  const shown = pageOf(location.pathname);
  if (!shown) return;
  markLoading();
  const asked = fetchDashboard(shown.days).catch(() => null);
  whenOwn((box, href) => {
    const global = queryOne(box, ':scope > .puzzle-dashboard__global', HTMLElement);
    // The dashboard's blocks come at once; the themes' list must be whole.
    if (shown.view === 'dashboard' ? !global : document.readyState === 'loading') return false;
    addTabs(box, shown.days, href);
    void asked.then(data => {
      if (!data) return giveUp();
      if (global) return addOverview(global, data);
      return addAreas(box, data, shown);
    });
    return true;
  });
}

export const puzzleDashboard: Feature = { name: 'puzzle dashboard', start };
