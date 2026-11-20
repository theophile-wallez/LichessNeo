import { html, type SafeHtml } from '#shared/html.ts';
import { isFrench } from '#shared/lang.ts';
import { runTexts } from '#shared/review-engine/panel-view.ts';
import { gridColumns, WIDE_ROW } from '#shared/review-engine/progress-grid.ts';
import { engineWords } from '#shared/review-engine/words.ts';
import { reviewEngine } from '#page/review/engine/review-engine.ts';
import type { Session } from '#page/review/session.ts';
import { statesOf, statusOf } from './engine-status.ts';

// The closed panel's card while the game is analysed: the run as the engine's
// popover shows it (#shared/review-engine), its level, the time left and a
// square per position, in the place the player's figures come to. Its rows are
// long, so its squares small: the card's row takes the moves' room.

/** The run going on, or null before the engine has its settings. */
export function cardProgress(session: Session): SafeHtml | null {
  const status = statusOf(session);
  if (!status.running) return null;
  const texts = runTexts({ options: reviewEngine(), words: engineWords(isFrench()), status });
  const states = statesOf(session);
  return html`<div class="ln-ext-end__run">
    <div class="ln-ext-engine__run"><span><b>${texts.running}</b>${texts.left}</span><strong>${texts.percent}<small>%</small></strong></div>
    <div class="ln-ext-engine__grid" style="--ln-ext-columns:${gridColumns(states.length, WIDE_ROW)}" aria-hidden="true">${states.map(state => html`<i data-ln-ext-state="${state}"></i>`)}</div>
  </div>`;
}
