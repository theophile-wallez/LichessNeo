import { createElement, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { html, setHtml, type SafeHtml } from '#shared/html.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { readExtremes, readFigures, readGlicko, readOpponents, readStreaks } from './read.ts';
import { figuresMarkup } from './view-figures.ts';
import { heroMarkup } from './view-hero.ts';
import { opponentsMarkup, streaksMarkup } from './view-records.ts';

// A rating's stats page (/@/<user>/perf/<perf>) as cards: the rating's own
// above the chart, the counts, streaks and opponents under it. Lichess's
// sections stay in the page, hidden (styles/profile/perf-stat/).

function bodyMarkup(content: HTMLElement): SafeHtml {
  return html`<div class="ln-ext-perf__row ln-ext-perf__row--figures">${figuresMarkup(readFigures(content))}</div>
    <div class="ln-ext-perf__row ln-ext-perf__row--streaks">${streaksMarkup(readStreaks(content))}</div>
    <div class="ln-ext-perf__row ln-ext-perf__row--opponents">${opponentsMarkup(readOpponents(content))}</div>`;
}

export function syncPerfStat(): void {
  const box = queryOne(document, 'main.page-menu > .perf-stat', HTMLElement);
  const content =
    box && queryOne(box, ':scope > .perf-stat__content:not([data-ln-ext-perf])', HTMLElement);
  const glicko = content && readGlicko(content);
  if (!box || !content || !glicko) return;
  setData(content, 'lnExtPerf', '');
  const hero = createElement('div', { className: 'ln-ext-perf ln-ext-perf--hero' });
  setHtml(
    hero,
    html`<div class="ln-ext-perf__row ln-ext-perf__row--hero">${heroMarkup(glicko, readExtremes(content))}</div>`,
  );
  const body = createElement('div', { className: 'ln-ext-perf ln-ext-perf--body' });
  setHtml(body, bodyMarkup(content));
  const top = queryOne(box, ':scope > .box__top', HTMLElement);
  if (top) top.after(hero);
  else content.before(hero);
  content.prepend(body);
}

export const perfStat: Feature = {
  name: 'perf stat',
  start: () => onEveryTick('perf stat', syncPerfStat),
};
