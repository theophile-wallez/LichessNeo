import { html, type SafeHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import type { Line, Tip } from './coach-line.ts';
import type { Overview, ThemeResult } from './data.ts';
import { number, sign, signed, trainHref } from './format.ts';
import { numbersMarkup } from './numbers.ts';

// The overview's head (styles/dashboard/overview.css): the period's numbers
// in one card, the coach's word, then the themes to work on and the strong
// ones, each a link to its puzzles.

const say = ({ name, values }: Line): string => message(name, ...values);

/** A tip as the coach says it: a new element each time, so it slides in anew. */
export const tipMarkup = (tip: Tip): SafeHtml =>
  html`<span class="ln-ext-pdash__say"><b>${say(tip.lead)}</b> ${say(tip.body)}</span>`;

// A dot per tip, the one said drawn long (puzzle-dashboard/coach.ts moves it).
const pager = (count: number): SafeHtml =>
  html`<div class="ln-ext-pdash__pager">
    <button type="button" class="ln-ext-pdash__turn" data-ln-ext-turn="back" aria-label="${message('pdashCoachBack')}"></button>
    <span class="ln-ext-pdash__dots">${Array.from({ length: count }, (_, i) => html`<i ${i === 0 && html`data-ln-ext-on`}></i>`)}</span>
    <button type="button" class="ln-ext-pdash__turn" data-ln-ext-turn="next" aria-label="${message('pdashCoachNext')}"></button>
  </div>`;

// The still shows until the live mascot is drawn over it (puzzle-dashboard/coach.ts).
const coach = (tips: readonly Tip[], coachId: number): SafeHtml =>
  html`<div class="ln-ext-pdash__coach">
    <span class="ln-ext-pdash__mascot" data-ln-ext-avatar-coach="${coachId}"></span>
    <div class="ln-ext-pdash__talk">
      <p class="ln-ext-pdash__tip" aria-live="polite">${tips[0] && tipMarkup(tips[0])}</p>
      ${tips.length > 1 && pager(tips.length)}
    </div>
  </div>`;

function item(theme: ThemeResult, action: string): SafeHtml {
  const share = theme.firstWins / theme.puzzles;
  return html`<a class="ln-ext-pdash__item" href="${trainHref(theme.key)}" data-ln-ext-sign="${sign(theme.gap)}">
    <span class="ln-ext-pdash__ring" style="--ln-ext-pdash-p: ${share.toFixed(3)}">
      <span>${theme.firstWins}/${theme.puzzles}</span>
    </span>
    <span class="ln-ext-pdash__theme">
      <b>${theme.name}</b>
      <small><em>${signed(theme.gap)}</em> ${message('pdashAgainst', number(theme.level))}</small>
    </span>
    <span class="ln-ext-pdash__go">${action}</span>
  </a>`;
}

function list(kind: 'weak' | 'strong', themes: readonly ThemeResult[]): SafeHtml {
  const weak = kind === 'weak';
  const action = message(weak ? 'pdashTrain' : 'pdashKeep');
  return html`<section class="ln-ext-pdash__list" data-ln-ext-list="${kind}">
    <header class="ln-ext-pdash__head">
      <h2>${message(weak ? 'pdashWork' : 'pdashStrengths')}</h2>
      <small>${message(weak ? 'pdashWorkSub' : 'pdashStrengthsSub')}</small>
    </header>
    ${themes.map(theme => item(theme, action))}
  </section>`;
}

export interface SummaryParts {
  readonly view: Overview;
  readonly tips: readonly Tip[];
  readonly coachId: number;
  /** Lichess's link to the failed puzzles, null when there are none. */
  readonly replayHref: string | null;
}

export function summaryMarkup({ view, tips, coachId, replayHref }: SummaryParts): SafeHtml {
  const lists = [
    view.weakest.length > 0 && list('weak', view.weakest),
    view.strongest.length > 0 && list('strong', view.strongest),
  ];
  return html`${numbersMarkup(view, replayHref)}${coach(tips, coachId)}
    <div class="ln-ext-pdash__lists">${lists}</div>`;
}
