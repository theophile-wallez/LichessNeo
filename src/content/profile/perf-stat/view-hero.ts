import ArrowDownRight01Icon from '@hugeicons/core-free-icons/ArrowDownRight01Icon';
import ArrowUpRight01Icon from '@hugeicons/core-free-icons/ArrowUpRight01Icon';
import { html, type SafeHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { formatDay } from './dates.ts';
import type { Extreme, Glicko } from './read.ts';

// The stats page's first row: the rating, the share of players it beats, and
// where it stands between the highest and the lowest.

function progressChip(progress: Glicko['progress']): SafeHtml {
  if (!progress || progress.value === 0) return html``;
  const up = progress.value > 0;
  return html`<span class="ln-ext-perf__chip" data-ln-ext-tone="${up ? 'green' : 'red'}" title="${progress.label}">${hugeicon(up ? ArrowUpRight01Icon : ArrowDownRight01Icon)}${up ? '+' : '−'}${Math.abs(progress.value)}</span>`;
}

function deviationChip(deviation: Glicko['deviation']): SafeHtml {
  if (!deviation) return html``;
  const tip = `${deviation.label}: ${deviation.value}. ${deviation.tip}`.trim();
  return html`<span class="ln-ext-perf__chip" title="${tip}">± ${Math.round(Number.parseFloat(deviation.value))}</span>`;
}

function ratingCard(glicko: Glicko): SafeHtml {
  return html`<section class="ln-ext-perf__card ln-ext-perf__now">
    <h3 class="ln-ext-perf__label">${glicko.label}</h3>
    <strong class="ln-ext-perf__rating">${glicko.written}</strong>
    <div class="ln-ext-perf__chips">${progressChip(glicko.progress)}${deviationChip(glicko.deviation)}</div>
  </section>`;
}

/** "99.9%" or "99,9 %" as a number, for the ring. */
const shareOf = (written: string): number =>
  Number.parseFloat(written.replace(',', '.').replaceAll(/[^\d.]/g, ''));

function percentileCard(glicko: Glicko): SafeHtml {
  if (glicko.sentence === '') return html``;
  const share = glicko.percentile === null ? Number.NaN : shareOf(glicko.percentile);
  const ring = Number.isNaN(share)
    ? html``
    : html`<span class="ln-ext-perf__ring"><svg viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="35"/><circle cx="42" cy="42" r="35" pathLength="100" stroke-dasharray="${share} 100"/></svg><b>${glicko.percentile}</b></span>`;
  return html`<section class="ln-ext-perf__card ln-ext-perf__percentile">${ring}<p>${glicko.sentence}</p></section>`;
}

function extremeEnd(extreme: Extreme, tone: 'green' | 'red'): SafeHtml {
  const day = extreme.game
    ? html`<a class="glpt" href="${extreme.game.href}">${formatDay(extreme.game.at)}</a>`
    : html``;
  return html`<div class="ln-ext-perf__end" data-ln-ext-tone="${tone}"><span>${extreme.label}</span><b>${extreme.rating}</b>${day}</div>`;
}

function rangeCard(rating: number, lowest: Extreme | null, highest: Extreme | null): SafeHtml {
  if (!lowest || !highest) return html``;
  const span = highest.rating - lowest.rating;
  const at = span > 0 ? Math.min(1, Math.max(0, (rating - lowest.rating) / span)) : 1;
  const percent = `${(at * 100).toFixed(1)}%`;
  return html`<section class="ln-ext-perf__card ln-ext-perf__range">
    <div class="ln-ext-perf__bar" style="--ln-ext-perf-at:${percent}"><i></i><em>${rating}</em></div>
    <div class="ln-ext-perf__ends">${extremeEnd(lowest, 'red')}${extremeEnd(highest, 'green')}</div>
  </section>`;
}

export function heroMarkup(
  glicko: Glicko,
  [highest, lowest]: readonly [Extreme | null, Extreme | null],
): SafeHtml {
  return html`${ratingCard(glicko)}${percentileCard(glicko)}${rangeCard(glicko.rating, lowest, highest)}`;
}
