import type { Color } from '#shared/chess/types.ts';
import { queryOne } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { opponentName } from '#page/game-over/board.ts';
import {
  cardMarkup,
  type Heading,
  headingOf,
  RESULT_MOODS,
  statsMarkup,
} from '#page/game-over/card.ts';
import { type Outcome, readOutcome } from '#page/game-over/outcome.ts';
import { formatAccuracy, type GameOverTexts, gameOverTexts } from '#page/game-over/texts.ts';
import type { Session } from '#page/review/session.ts';
import { newGameMarkup } from './new-game.ts';

// The review closed: the game over's card (page/game-over/card.ts), as the
// game's page showed it at its end, over the ways back into the review: its
// summary, or Game Review itself, move by move. It speaks to the player of
// their moves; to anyone else, of the board's bottom side's.

interface Side {
  readonly color: Color;
  /** The viewer played the game, as that side. */
  readonly played: boolean;
}

function sideOf(analysis: Analysis): Side {
  const viewer = analysis.viewerColor();
  return viewer
    ? { color: viewer, played: true }
    : { color: analysis.orientation(), played: false };
}

const outcomeOf = (analysis: Analysis, side: Side): Outcome | null =>
  analysis.status === ''
    ? null
    : readOutcome({
        status: analysis.status,
        winner: analysis.winner ?? undefined,
        player: side.color,
      });

function heading(outcome: Outcome | null, side: Side, fallback: string): Heading {
  const texts = gameOverTexts();
  if (!outcome) return { tag: '', title: fallback };
  if (!side.played) {
    // Not a defeat or a victory of theirs: only how it ended, which a draw's title says.
    const { reason } = outcome;
    const tag = reason === 'draw' || reason === 'other' ? '' : texts.kingLabels[reason];
    return { tag, title: texts.watchedTitle(outcome.winner) };
  }
  const main = queryOne(document, 'main.analyse', HTMLElement);
  const opponent = main ? opponentName(main, side.color, texts.anonymous) : texts.anonymous;
  return headingOf(outcome, texts, opponent);
}

/** The figures once the analysis is done; until then, how far it's got. */
function stats(session: Session, color: Color, texts: GameOverTexts): SafeHtml {
  const { view, language } = session;
  if (view.error) return html`<p class="lr-ext-end__progress">${view.error}</p>`;
  const { review } = view;
  if (!review?.complete)
    return html`<p class="lr-ext-end__progress">${language.ui.analysing} ${Math.round(view.progress * 100)}%</p>`;
  // Here the review is the page's own: its chips lead nowhere.
  const summary = {
    accuracy: review.accuracy[color],
    counts: review.counts[color],
    firstPlies: {},
  };
  return statsMarkup(summary, texts);
}

/** What the coach says to the player, their accuracy once known; nothing to a spectator. */
function words(session: Session, side: Side, result: Outcome['result']): string {
  const texts = gameOverTexts();
  const { review } = session.view;
  if (!side.played) return '';
  if (!review?.complete) return texts.analysing;
  const accuracy = review.accuracy[side.color];
  return texts.verdict(result, accuracy === null ? null : formatAccuracy(accuracy));
}

export function renderClosed(session: Session, analysis: Analysis): void {
  const texts = gameOverTexts();
  const side = sideOf(analysis);
  const outcome = outcomeOf(analysis, side);
  // The glow is the player's result; a spectator's stays neutral.
  const result = side.played ? (outcome?.result ?? 'draw') : 'draw';
  const { ui } = session.language;
  const card = cardMarkup({
    result,
    heading: heading(outcome, side, ui.review),
    words: words(session, side, result),
    mood: side.played ? RESULT_MOODS[result] : 'neutral',
    coachId: session.coach.id,
    texts,
    stats: stats(session, side.color, texts),
  });
  setHtml(
    session.elements.panel,
    html`<div class="lr-ext-end__frame">${card}<div class="lr-ext-end__foot">
      <button class="lr-ext-btn" data-lr-ext="summary">${ui.summary}</button>
      <button class="lr-ext-btn lr-ext-btn--green" data-lr-ext="moves">${ui.review}</button>
      ${newGameMarkup(analysis, 'lr-ext-btn')}
    </div></div>`,
  );
}
