import { html, trustedHtml, type SafeHtml } from '#shared/html.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';
import type { Outcome } from './outcome.ts';
import type { GameOverTexts } from './texts.ts';

// The game over's card, at the head of Lichess's follow-up buttons in the
// right-hand panel (styles/game/game-end-card.css): the coach standing in a
// glow of the result's color beside the result and its words, then the
// player's accuracy and counts. Lichess's own buttons, under it, are the
// card's. Drawn once; the coach's words and the figures are filled in apart,
// so the coach's face, which the content script animates, stays the same
// element.

// The card counts two good classes, then the worst error the player made; with
// none, their finest moves.
const GOOD: readonly MoveClass[] = ['best', 'excellent'];
const ERRORS: readonly MoveClass[] = ['blunder', 'miss', 'mistake', 'inaccuracy'];
const FINEST: readonly MoveClass[] = ['brilliant', 'great'];

/** The three classes the card counts for the player. */
export function cardClasses(counts: Readonly<Partial<Record<MoveClass, number>>>): MoveClass[] {
  const made = (moveClass: MoveClass): boolean => (counts[moveClass] ?? 0) > 0;
  const third = ERRORS.find(made) ?? FINEST.find(made) ?? 'good';
  return [...GOOD, third];
}

/** How many count chips the card has. */
export const CHIP_COUNT = 3;

export interface CardInput {
  readonly outcome: Outcome;
  readonly texts: GameOverTexts;
  readonly coachId: number;
  readonly opponent: string;
}

const CHIP = trustedHtml(
  '<span class="cdc-end__count"><span class="cdc-end__count-top"><span class="cdc-end__count-icon"></span><b></b></span><span class="cdc-end__count-label"></span></span>',
);

export function cardMarkup({ outcome, texts, coachId, opponent }: CardInput): SafeHtml {
  const reason = texts.reasons[outcome.reason];
  const tag =
    reason === '' ? texts.results[outcome.result] : `${texts.results[outcome.result]} · ${reason}`;
  return html`<section class="cdc-end__card cdc-end__card--${outcome.result}" aria-labelledby="cdc-end-title">
    <div class="cdc-end__glow">
      <span class="cdc-coach__avatar" data-cdc-coach-id="${coachId}" data-cdc-mood="neutral"><span class="cdc-coach__face"></span></span>
      <div class="cdc-end__main">
        <p class="cdc-end__reason">${tag}</p>
        <h2 class="cdc-end__title" id="cdc-end-title">${texts.title(outcome.result, opponent)}</h2>
        <p class="cdc-end__bubble"></p>
      </div>
    </div>
    <div class="cdc-end__stats">
      <p class="cdc-end__accuracy"><b>–</b><span>${texts.accuracy}</span></p>
      <div class="cdc-end__counts">${Array.from({ length: CHIP_COUNT }, () => CHIP)}</div>
    </div>
  </section>`;
}
