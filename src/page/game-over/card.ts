import type { CoachMood } from '#shared/coach.ts';
import { html, trustedHtml, type SafeHtml } from '#shared/html.ts';
import { CLASS_COLORS, type MoveClass } from '#page/review/classes/classes.ts';
import { classSvg } from '#page/review/classes/icon-svg.ts';
import type { Outcome, Result } from './outcome.ts';
import type { PlayerSummary } from './quick-review.ts';
import { formatAccuracy, type GameOverTexts } from './texts.ts';

// The game over's card (styles/game/game-end-card.css): the coach standing in
// a glow of the result's color beside the result and its words, then the
// player's accuracy and counts. At a game's end it heads Lichess's follow-up
// buttons, which are its foot, and fills in as the coach looks at the moves
// (view.ts); on the game's analysis, the closed Game Review draws it with its
// figures (page/review/view/closed-panel.ts).

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

/** The coach's face for a result: pleased with a win, sorry for a loss. */
export const RESULT_MOODS: Readonly<Record<Result, CoachMood>> = {
  win: 'happy',
  loss: 'worry',
  draw: 'neutral',
};

/** How many count chips the card has. */
export const CHIP_COUNT = 3;

/** The card's heading: the result and how it came, over the title. */
export interface Heading {
  readonly tag: string;
  readonly title: string;
}

export function headingOf(outcome: Outcome, texts: GameOverTexts, opponent: string): Heading {
  const reason = texts.reasons[outcome.reason];
  const result = texts.results[outcome.result];
  return {
    tag: reason === '' ? result : `${result} · ${reason}`,
    title: texts.title(outcome.result, opponent),
  };
}

export interface CardInput {
  /** Colors the glow. */
  readonly result: Result;
  readonly heading: Heading;
  /** The coach's words; empty, they're typed out later. */
  readonly words: string;
  readonly mood: CoachMood;
  readonly coachId: number;
  readonly texts: GameOverTexts;
  /** What the figures' strip holds; by default, empty chips to fill in. */
  readonly stats?: SafeHtml;
}

export interface EndInput {
  readonly outcome: Outcome;
  readonly texts: GameOverTexts;
  readonly coachId: number;
  readonly opponent: string;
}

/** The card at a game's end: the coach yet to speak, the figures yet to come. */
export const endCardInput = ({ outcome, texts, coachId, opponent }: EndInput): CardInput => ({
  result: outcome.result,
  heading: headingOf(outcome, texts, opponent),
  words: '',
  mood: 'neutral',
  coachId,
  texts,
});

const CHIP = trustedHtml(
  '<span class="cdc-end__count"><span class="cdc-end__count-top"><span class="cdc-end__count-icon"></span><b></b></span><span class="cdc-end__count-label"></span></span>',
);

const emptyStats = (texts: GameOverTexts): SafeHtml =>
  html`<p class="cdc-end__accuracy"><b>–</b><span>${texts.accuracy}</span></p>
    <div class="cdc-end__counts">${Array.from({ length: CHIP_COUNT }, () => CHIP)}</div>`;

/** The strip with the player's figures in, for a card drawn at once. */
export function statsMarkup(summary: PlayerSummary, texts: GameOverTexts): SafeHtml {
  const accuracy = summary.accuracy === null ? '–' : formatAccuracy(summary.accuracy);
  const chips = cardClasses(summary.counts).map(moveClass => {
    const count = summary.counts[moveClass] ?? 0;
    return html`<span class="cdc-end__count" style="--cdc-count-c:${CLASS_COLORS[moveClass]}"><span class="cdc-end__count-top"><span class="cdc-end__count-icon">${classSvg(moveClass)}</span><b>${count}</b></span><span class="cdc-end__count-label">${texts.countLabel(moveClass, count)}</span></span>`;
  });
  return html`<p class="cdc-end__accuracy"><b>${accuracy}</b><span>${texts.accuracy}</span></p>
    <div class="cdc-end__counts">${chips}</div>`;
}

export function cardMarkup(input: CardInput): SafeHtml {
  const { result, heading, words, mood, coachId, texts } = input;
  const tag = heading.tag === '' ? '' : html`<p class="cdc-end__reason">${heading.tag}</p>`;
  return html`<section class="cdc-end__card cdc-end__card--${result}" aria-labelledby="cdc-end-title">
    <div class="cdc-end__glow">
      <span class="cdc-coach__avatar" data-cdc-coach-id="${coachId}" data-cdc-mood="${mood}"><span class="cdc-coach__face"></span></span>
      <div class="cdc-end__main">
        ${tag}<h2 class="cdc-end__title" id="cdc-end-title">${heading.title}</h2>
        <p class="cdc-end__bubble">${words}</p>
      </div>
    </div>
    <div class="cdc-end__stats">${input.stats ?? emptyStats(texts)}</div>
  </section>`;
}
