import type { Color } from '#shared/chess/types.ts';
import { queryOne, setData } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { opponentName } from '#page/game-over/board.ts';
import { foldButtonMarkup } from '#page/game-over/card-fold.ts';
import {
  cardMarkup,
  type Heading,
  headingOf,
  lastCardClass,
  RESULT_MOODS,
  statsMarkup,
} from '#page/game-over/card.ts';
import { type Outcome, readOutcome } from '#page/game-over/outcome.ts';
import { formatAccuracy, type GameOverTexts, gameOverTexts } from '#page/game-over/texts.ts';
import type { Session } from '#page/review/session.ts';
import { type PeekFigures, peekMarkup } from './card-peek.ts';

// The review closed: the game over's card (page/game-over/card.ts), as the
// game's page showed it at its end, and folded, a strip of it (view/card-peek.ts);
// the tabs over the column lead back into the review, and to a new game
// (view/mode-tabs.ts). It speaks to the player of their moves; to anyone else,
// of the board's bottom side's.

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
  if (view.error) return html`<p class="ln-ext-end__progress">${view.error}</p>`;
  const { review } = view;
  if (!review?.complete)
    return html`<p class="ln-ext-end__progress">${language.ui.analysing} ${Math.round(view.progress * 100)}%</p>`;
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

/** Whose card it is and how their game went, which the card and its strip both tell. */
interface Verdict {
  readonly side: Side;
  /** Colors the glow: the player's result, a spectator's neutral. */
  readonly result: Outcome['result'];
  readonly heading: Heading;
}

function verdictOf(session: Session, analysis: Analysis): Verdict {
  const side = sideOf(analysis);
  const outcome = outcomeOf(analysis, side);
  return {
    side,
    result: side.played ? (outcome?.result ?? 'draw') : 'draw',
    heading: heading(outcome, side, session.language.ui.review),
  };
}

function card(session: Session, { side, result, heading }: Verdict): SafeHtml {
  const texts = gameOverTexts();
  return cardMarkup({
    result,
    heading,
    words: words(session, side, result),
    mood: side.played ? RESULT_MOODS[result] : 'neutral',
    coachId: session.coach.id,
    texts,
    stats: stats(session, side.color, texts),
  });
}

/** The strip's figures: the card's accuracy and its last count, or how far the analysis has got. */
function peekFigures(session: Session, color: Color): PeekFigures | string {
  const { view, language } = session;
  const { review } = view;
  if (view.error) return '';
  if (!review?.complete) return `${language.ui.analysing} ${Math.round(view.progress * 100)}%`;
  const accuracy = review.accuracy[color];
  const counts = review.counts[color];
  const moveClass = lastCardClass(counts);
  return {
    accuracy: accuracy === null ? '–' : formatAccuracy(accuracy),
    moveClass,
    count: counts[moveClass] ?? 0,
  };
}

const frameMarkup = (texts: GameOverTexts): SafeHtml =>
  html`<div class="ln-ext-end__frame">
    <div class="ln-ext-end__top"><div class="ln-ext-end__top-inner"></div></div>
    <div class="ln-ext-end__foot">${foldButtonMarkup(texts, 'unfold', html`<span class="ln-ext-end__peek"></span>`)}</div>
  </div>`;

export function renderClosed(session: Session, analysis: Analysis): void {
  const { panel } = session.elements;
  const texts = gameOverTexts();
  // The frame stays from one draw to the next, so that the card's fold eases on while
  // the analysis redraws it: only its parts are drawn again.
  if (!queryOne(panel, '.ln-ext-end__frame', HTMLElement)) setHtml(panel, frameMarkup(texts));
  const verdict = verdictOf(session, analysis);
  const top = queryOne(panel, '.ln-ext-end__top-inner', HTMLElement);
  if (top) setHtml(top, html`${card(session, verdict)}${foldButtonMarkup(texts, 'fold')}`);
  const peek = queryOne(panel, '.ln-ext-end__peek', HTMLElement);
  if (!peek) return;
  setData(peek, 'lnExtResult', verdict.result);
  const { heading } = verdict;
  const figures = peekFigures(session, verdict.side.color);
  setHtml(peek, peekMarkup({ heading, coachId: session.coach.id, figures }));
}
