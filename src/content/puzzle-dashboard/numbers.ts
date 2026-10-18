import { html, type SafeHtml } from '#shared/html.ts';
import { pageLocale } from '#shared/lang.ts';
import { message } from '#content/platform/runtime.ts';
import type { Overview } from './data.ts';
import { days, number, percent, sign, signed, trainHref } from './format.ts';

// The period's numbers, in one card (styles/dashboard/overview-numbers.css):
// the first-try share as a ring, the performance and the best theme against
// their level, then the puzzles to replay as the card's foot.

const gapPill = (gap: number): SafeHtml =>
  html`<span class="ln-ext-pdash__pill" data-ln-ext-sign="${sign(gap)}">${signed(gap)}</span>`;

function ring(view: Overview): SafeHtml {
  const share = view.puzzles === 0 ? 0 : view.firstWins / view.puzzles;
  return html`<div class="ln-ext-pdash__lead">
    <span class="ln-ext-pdash__ring ln-ext-pdash__ring--big" style="--ln-ext-pdash-p: ${share.toFixed(3)}">
      <span>${percent(share)}</span>
    </span>
    <div>
      <span class="ln-ext-pdash__label">${message('pdashSolved')}</span>
      <strong>${message('pdashSolvedOf', number(view.firstWins), number(view.puzzles))}</strong>
      <span class="ln-ext-pdash__sub">${message('pdashSolvedOver', days(view.days))}</span>
    </div>
  </div>`;
}

function best(view: Overview): SafeHtml | false {
  const [top] = view.strongest;
  return (
    top !== undefined &&
    html`<a class="ln-ext-pdash__cell" href="${trainHref(top.key)}">
      <span class="ln-ext-pdash__label">${message('pdashBest')}</span>
      <strong class="ln-ext-pdash__name">${top.name}</strong>
      <span class="ln-ext-pdash__sub">${gapPill(top.gap)} ${message('pdashBestAgainst')}</span>
    </a>`
  );
}

function foot(view: Overview, replayHref: string | null): SafeHtml {
  if (view.toReplay === 0 || replayHref === null)
    return html`<div class="ln-ext-pdash__foot">${message('pdashAllClear')}</div>`;
  const one = new Intl.PluralRules(pageLocale()).select(view.toReplay) === 'one';
  return html`<a class="ln-ext-pdash__foot" href="${replayHref}">
    <span><b>${number(view.toReplay)}</b> ${message(one ? 'pdashFailedOne' : 'pdashFailed')}</span>
    <span class="ln-ext-pdash__go-replay">${message('pdashReplay')}</span>
  </a>`;
}

export function numbersMarkup(view: Overview, replayHref: string | null): SafeHtml {
  const gap = view.performance - view.level;
  return html`<div class="ln-ext-pdash__numbers">
    ${ring(view)}
    <div class="ln-ext-pdash__cell">
      <span class="ln-ext-pdash__label">${message('pdashPerformance')}</span>
      <strong>${number(view.performance)}</strong>
      <span class="ln-ext-pdash__sub">${gapPill(gap)} ${message('pdashAgainst', number(view.level))}</span>
    </div>
    ${best(view)}
    ${foot(view, replayHref)}
  </div>`;
}
