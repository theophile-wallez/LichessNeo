import type { Color } from '#shared/chess/types.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { CLASS_COLORS } from '#page/review/classes/classes.ts';
import { classIcon } from '#page/review/classes/icon-svg.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import { type Phase, PHASES } from '#page/review/rating/phases.ts';
import type { GameRating, PhaseVerdict } from '#page/review/rating/rate-game.ts';

// The summary's phases: a row per phase, each side's verdict on it (the game
// rating's, rating/rate-game.ts) as the icon and name of the class it deserves.

export interface PhasesInput {
  /** Null until every move is judged at full depth. */
  readonly rating: GameRating | null;
  readonly language: ReviewLanguage;
  /** The sides from left to right, as their cards are. */
  readonly order: readonly Color[];
}

function verdictCell(verdict: PhaseVerdict | null | undefined, language: ReviewLanguage): SafeHtml {
  if (verdict === undefined)
    return html`<span class="ln-ext-sum-verdict ln-ext-sum-verdict--none">·</span>`;
  if (verdict === null)
    return html`<span class="ln-ext-sum-verdict ln-ext-sum-verdict--none">—</span>`;
  return html`<span class="ln-ext-sum-verdict" style="--ln-ext-class-color:${CLASS_COLORS[verdict]}">${classIcon(verdict)}<span>${language.classLabels[verdict]}</span></span>`;
}

function row({ rating, language, order }: PhasesInput, phase: Phase): SafeHtml {
  const { name, how } = language.ui.phases[phase];
  const verdicts = order.map(color =>
    verdictCell(rating ? (rating[color]?.phases[phase] ?? null) : undefined, language),
  );
  return html`<div class="ln-ext-sum-phase">
      <span class="ln-ext-sum-phase__name">${name}<span class="ln-ext-sum-how" data-ln-ext-tip="${how}" aria-label="${how}">?</span></span>
      ${verdicts}
    </div>`;
}

/** Every phase while the game is analyzed; once it's rated, those neither side reached are left out. */
export function phasesMarkup(input: PhasesInput): SafeHtml {
  const { rating, language } = input;
  const reached = (phase: Phase): boolean =>
    !rating || Boolean(rating.white?.phases[phase] ?? rating.black?.phases[phase]);
  return html`<h2 class="ln-ext-sum-h">${language.ui.phasesTitle}</h2>
    <div class="ln-ext-sum-phases">${PHASES.filter(reached).map(phase => row(input, phase))}</div>`;
}
