import { html, trustedHtml, type SafeHtml } from '#shared/html.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';
import { ICONS } from './icons.ts';
import type { Outcome, Result } from './outcome.ts';
import type { GameOverTexts, Quote } from './texts.ts';

// The game over's card over the board: the coach in a band lit in the
// result's color, the result, its word on the player's moves and the game's
// follow-ups (a new game, a rematch); beside, a card within with the player's
// accuracy and counts over the way to Game Review, level with the follow-ups. Drawn once; the coach's words, the figures and the
// buttons are filled in apart, so the coach's face, which the content script
// animates, stays the same element.

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
  /** A chess player's words under the coach's, after a loss or a draw. */
  readonly quote: Quote | null;
}

/** One of the result's quotes at random; none for a win. */
export function pickQuote(
  result: Result,
  texts: GameOverTexts,
  random: () => number,
): Quote | null {
  if (result === 'win') return null;
  const quotes = texts.quotes[result];
  return quotes[Math.floor(random() * quotes.length)] ?? null;
}

const quoteMarkup = (quote: Quote | null): SafeHtml | '' =>
  quote
    ? html`<figure class="cdc-end__quote"><blockquote>${quote.text}</blockquote><figcaption>${quote.author}</figcaption></figure>`
    : '';

const CHIP = trustedHtml(
  '<span class="cdc-end__count"><span class="cdc-end__count-top"><span class="cdc-end__count-icon"></span><b></b></span><span class="cdc-end__count-label"></span></span>',
);

export function cardMarkup({ outcome, texts, coachId, opponent, quote }: CardInput): SafeHtml {
  const reason = texts.reasons[outcome.reason];
  const tag =
    reason === '' ? texts.results[outcome.result] : `${texts.results[outcome.result]} · ${reason}`;
  return html`<section class="cdc-end__card cdc-end__card--${outcome.result}" role="dialog" aria-labelledby="cdc-end-title">
    <div class="cdc-end__main">
      <div class="cdc-end__band"><span class="cdc-coach__avatar" data-cdc-coach-id="${coachId}" data-cdc-mood="neutral"><span class="cdc-coach__face"></span></span></div>
      <p class="cdc-end__reason">${tag}</p>
      <h2 class="cdc-end__title" id="cdc-end-title">${texts.title(outcome.result, opponent)}</h2>
      <p class="cdc-end__bubble"></p>
      ${quoteMarkup(quote)}
      <div class="cdc-end__more"></div>
    </div>
    <div class="cdc-end__stub">
      <p class="cdc-end__accuracy"><b>–</b><span>${texts.accuracy}</span></p>
      <div class="cdc-end__counts">${Array.from({ length: CHIP_COUNT }, () => CHIP)}</div>
      <div class="cdc-end__actions"></div>
    </div>
    <button class="cdc-end__close" type="button" aria-label="${texts.close}" data-cdc-tip="${texts.close}">${ICONS.cross}</button>
  </section>`;
}

/** What the game's follow-up offers, read off Lichess's buttons. */
export interface FollowUp {
  readonly reviewHref: string;
  readonly newGame: string | null;
  readonly rematch: string | null;
}

const secondButton = (action: string, label: string | null): SafeHtml | '' =>
  label === null
    ? ''
    : html`<button class="cdc-end__btn" type="button" data-cdc-end="${action}">${label}</button>`;

/** The way to Game Review, at the bottom of the stats' card. */
export const actionsMarkup = (followUp: FollowUp, texts: GameOverTexts): SafeHtml =>
  html`<a class="cdc-end__review" href="${followUp.reviewHref}">${texts.review}</a>`;

/** The game's follow-ups, under the coach's words: empty when Lichess offers none. */
export const followUpMarkup = (followUp: FollowUp): SafeHtml =>
  html`${[secondButton('new-game', followUp.newGame), secondButton('rematch', followUp.rematch)]}`;
