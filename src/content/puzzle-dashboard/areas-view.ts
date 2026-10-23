import { html, type SafeHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import type { AreaTheme } from './areas-read.ts';
import { number, sign, signed, trainHref } from './format.ts';
import { mascotMarkup } from './mascot.ts';

// The improvement areas and strengths (styles/dashboard/areas.css): the
// first theme in a card of its own, the player's mascot beside it, then the
// others in a list. Weak themes in red, strong ones in green.

export type AreaKind = 'weak' | 'strong';

const pill = (gap: number): SafeHtml =>
  html`<span class="ln-ext-pdash__pill" data-ln-ext-sign="${sign(gap)}">${signed(gap)}</span>`;

const ring = ({ result }: AreaTheme, big: boolean): SafeHtml =>
  html`<span class="ln-ext-pdash__ring ${big && 'ln-ext-pdash__ring--big'}" style="--ln-ext-pdash-p: ${(result.firstWins / result.puzzles).toFixed(3)}">
    <span>${result.firstWins}/${result.puzzles}</span>
  </span>`;

const replay = (theme: AreaTheme, className: string, label: string): SafeHtml | false =>
  theme.replayHref !== null &&
  theme.result.replays > 0 &&
  html`<a class="${className}" href="${theme.replayHref}">${label}</a>`;

function fact(value: SafeHtml | string, label: string): SafeHtml {
  return html`<div class="ln-ext-pdash__fact"><b>${value}</b><span>${label}</span></div>`;
}

function hero(theme: AreaTheme, kind: AreaKind, coachId: number | null): SafeHtml {
  const { result } = theme;
  const strong = kind === 'strong';
  return html`<div class="ln-ext-pdash__hero">
    ${mascotMarkup(coachId)}
    <div class="ln-ext-pdash__about">
      <small>${message(strong ? 'pdashBestWeapon' : 'pdashStartHere')}</small>
      <h2>${result.name}</h2>
      <p>${theme.description}</p>
      <div class="ln-ext-pdash__facts">
        ${ring(theme, true)}
        ${fact(html`${number(result.performance)} ${pill(result.gap)}`, message('pdashFactPerformance'))}
        ${fact(number(result.level), message('pdashFactLevel'))}
        ${fact(number(result.puzzles), message('pdashFactPlayed'))}
      </div>
    </div>
    <div class="ln-ext-pdash__acts">
      <a class="ln-ext-pdash__train" href="${trainHref(result.key)}">${message(strong ? 'pdashKeepSharp' : 'pdashTrainNow')}</a>
      ${replay(theme, 'ln-ext-pdash__again', message('pdashReplayCount', number(result.replays)))}
    </div>
  </div>`;
}

function row(theme: AreaTheme, kind: AreaKind): SafeHtml {
  const { result } = theme;
  return html`<div class="ln-ext-pdash__area">
    ${ring(theme, false)}
    <a class="ln-ext-pdash__theme" href="${trainHref(result.key)}">
      <b>${result.name}</b>
      <small>${pill(result.gap)} ${message('pdashAgainst', number(result.level))}</small>
    </a>
    ${replay(theme, 'ln-ext-pdash__again ln-ext-pdash__again--count', number(result.replays))}
    <a class="ln-ext-pdash__go" href="${trainHref(result.key)}">${message(kind === 'strong' ? 'pdashKeep' : 'pdashTrain')}</a>
  </div>`;
}

export function areasMarkup(
  themes: readonly AreaTheme[],
  kind: AreaKind,
  coachId: number | null,
): SafeHtml {
  const [first, ...rest] = themes;
  if (!first) return html``;
  return html`${hero(first, kind, coachId)}
    ${
      rest.length > 0 &&
      html`<section class="ln-ext-pdash__list">
      <header class="ln-ext-pdash__head">
        <h2>${message(kind === 'strong' ? 'pdashAlsoStrong' : 'pdashThenThese')}</h2>
      </header>
      ${rest.map(theme => row(theme, kind))}
    </section>`
    }`;
}
