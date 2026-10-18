import { html, type SafeHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import type { Overview, ThemeResult } from './data.ts';
import { number, sign, signed, trainHref } from './format.ts';

// Every theme with enough puzzles, best first, as a bar either side of zero:
// how far above or below the level of its puzzles the player performed.

function row(theme: ThemeResult, widest: number): SafeHtml {
  const share = widest === 0 ? 0 : Math.abs(theme.gap) / widest;
  return html`<a class="ln-ext-pdash__row" href="${trainHref(theme.key)}" data-ln-ext-sign="${sign(theme.gap)}">
    <span class="ln-ext-pdash__name">${theme.name}</span>
    <span class="ln-ext-pdash__count">${theme.firstWins}/${theme.puzzles}</span>
    <span class="ln-ext-pdash__track"><i style="--ln-ext-pdash-p: ${share.toFixed(3)}"></i></span>
    <span class="ln-ext-pdash__gap" title="${number(theme.performance)}">${signed(theme.gap)}</span>
  </a>`;
}

export function chartMarkup({ themes, fewer }: Overview): SafeHtml {
  if (themes.length === 0) return html``;
  const widest = Math.max(...themes.map(theme => Math.abs(theme.gap)));
  return html`<section class="ln-ext-pdash__chart">
    <header class="ln-ext-pdash__head">
      <h2>${message('pdashByTheme')}</h2>
      <small>${message('pdashByThemeSub')}</small>
    </header>
    <div class="ln-ext-pdash__axis" aria-hidden="true">
      <span>${message('pdashPuzzles')}</span>
      <span>← ${message('pdashBelow')}</span>
      <span>${message('pdashAbove')} →</span>
    </div>
    <div class="ln-ext-pdash__rows">${themes.map(theme => row(theme, widest))}</div>
    ${fewer > 0 && html`<p class="ln-ext-pdash__fewer">${message('pdashFewer', number(fewer))}</p>`}
  </section>`;
}
