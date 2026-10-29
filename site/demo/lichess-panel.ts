import { html, type SafeHtml } from '#shared/html.ts';
import { cardMarkup, statsMarkup } from '#page/game-over/card.ts';
import { gameOverTexts } from '#page/game-over/texts.ts';
import { translate } from '#page/lichess/globals.ts';
import { accuracy, moves } from './review.ts';
import { classCounts } from '#page/review/judge/summary.ts';

// The Moves tab: Lichess's own panel as the extension dresses it, its Moves
// and Chat tabs, its engine's switch over its move list (movesMarkup, bare),
// and under them the closed review's card (page/review/view/closed-panel.ts),
// as a spectator sees it: how the game ended, and the board's bottom side's
// figures, White's here.

const counts = classCounts(moves);

/** The card a spectator gets: Morphy's mate, and his accuracy and counts. */
export function endCardMarkup(coachId: number): SafeHtml {
  const texts = gameOverTexts();
  return cardMarkup({
    result: 'draw',
    heading: { tag: texts.kingLabels.mate, title: texts.watchedTitle('white') },
    words: '',
    mood: 'neutral',
    coachId,
    texts,
    stats: statsMarkup({ accuracy: accuracy.white, counts: counts.white, firstPlies: {} }, texts),
  });
}

/** Lichess's tabs over its tools, and its engine's switch, off: the demo runs no engine. */
export const lichessToolsMarkup = (): SafeHtml =>
  html`<div class="demo-lichess__tabs" aria-hidden="true"><span class="demo-lichess__tab--on">${translate('moves', 'Moves')}</span><span>${translate('chat', 'Chat')}</span></div>
    <div class="demo-ceval" aria-hidden="true">
      <span class="demo-ceval__toggle"></span>
      <span class="demo-ceval__engine"><span>SF 19 1MB <b>NNUE</b></span><span>in local browser</span></span>
      <span class="icon i-settings-01"></span>
    </div>`;
