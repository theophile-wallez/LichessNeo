import { html, type SafeHtml } from '#shared/html.ts';
import { isFrench } from '#shared/lang.ts';
import { newGameLabel } from '#shared/time-control.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { GameSeekDataSchema, nextGameAfter } from '#page/seek/next-game.ts';

// A new game like the one reviewed, in every panel of its review: a link that page/seek follows
// right there, as the game page's "New opponent" (styles/review/new-game.css).

/** The link, `className` its look in the panel; nothing for a game without a clock. */
export function newGameMarkup(analysis: Analysis, className: string): SafeHtml | '' {
  const data = analysis.dataOf(GameSeekDataSchema);
  const next = data && nextGameAfter(data, Boolean(document.body.dataset.user));
  if (!data?.clock || !next) return '';
  const label = newGameLabel(data.clock, isFrench());
  return html`<a class="${className} ln-ext-new-game" href="${next.fallback}">${label}</a>`;
}
