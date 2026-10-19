import type { Color } from '#shared/chess/types.ts';
import { queryOne } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import type { Analysis, Player } from '#page/lichess/analysis.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import { playerProfile, type Profile } from '#page/review/judge/profile.ts';
import type { Review, Session } from '#page/review/session.ts';
import { mountGraph } from './graph.ts';
import { learnLabel } from './learn.ts';
import { header } from './markup.ts';
import { movesMarkup } from './summary-moves.ts';
import { playerName, playersMarkup, sideOrder, watchPlayerFocus } from './summary-players.ts';
import { radarMarkup } from './summary-radar.ts';
import { newGameMarkup } from './new-game.ts';

// The summary: the graph and the two players over the moves and the
// phases. It keeps its layout while the game is analyzed, filling in from
// the quick pass's draft, then at full depth. Each side has a color
// (styles/review/summary.css) its card, bars and radar shape share.

interface SummaryInput {
  /** The sides from left to right: the signed-in user's own first. */
  readonly order: readonly Color[];
  readonly review: Review | null;
  readonly error: string | null;
  readonly allRows: boolean;
  readonly players: Readonly<Record<Color, Player | undefined>>;
  readonly winner: Color | null;
  readonly language: ReviewLanguage;
  /** "Learn from your mistakes", when the exercise can start. */
  readonly learn: string | null;
  /** The header's link to a new game like this one. */
  readonly newGame: SafeHtml | '';
}

// The profiles stand on full-depth verdicts only, as the game rating does.
function profilesOf(review: Review | null): Record<Color, Profile> | null {
  if (!review?.complete) return null;
  const moves = review.moves.filter(move => move !== undefined);
  return { white: playerProfile(moves, 'white'), black: playerProfile(moves, 'black') };
}

const namesOf = ({ players, language }: SummaryInput): Record<Color, string> => ({
  white: playerName(players.white, language),
  black: playerName(players.black, language),
});

function summaryMarkup(input: SummaryInput): SafeHtml {
  const { review, error, language, learn } = input;
  const canStart = review !== null && !error;
  return html`${header(language.ui.review, 'normal', language, input.newGame)}
      <div class="ln-ext-review__top">
        ${error ? html`<p class="ln-ext-review__error">${error}</p>` : ''}
        <div class="ln-ext-review__graph ln-ext-summary-graph"></div>
        ${playersMarkup(input)}
      </div>
      <div class="ln-ext-review__body">${movesMarkup(input)}${radarMarkup({ profiles: profilesOf(review), names: namesOf(input), language, order: input.order })}</div>
      <div class="ln-ext-review__foot"><button class="ln-ext-btn ln-ext-btn--green" data-ln-ext="moves" ${canStart ? '' : 'disabled'}>${language.ui.start}</button>${learn === null ? '' : html`<button class="ln-ext-btn ln-ext-review__learn" data-ln-ext="learn">${learn}</button>`}</div>`;
}

export function renderSummary(session: Session, analysis: Analysis): void {
  const { view, language, elements } = session;
  const { review, error } = view;
  const players = analysis.players();
  setHtml(
    elements.panel,
    summaryMarkup({
      // Lichess names the signed-in user on <body>.
      order: sideOrder(players, document.body.dataset.user),
      review,
      error,
      allRows: view.allRows,
      players,
      winner: analysis.winner,
      language,
      learn: learnLabel(analysis),
      newGame: newGameMarkup(analysis, 'ln-ext-review__new'),
    }),
  );
  watchPlayerFocus(elements.panel);
  const graph = queryOne(elements.panel, '.ln-ext-summary-graph', HTMLElement);
  if (!graph) return;
  if (review) mountGraph(session, analysis, { container: graph, kind: 'summary' });
  if (!review?.complete && !error)
    graph.insertAdjacentHTML(
      'afterbegin',
      html`<span class="ln-ext-summary-pct">${Math.round(view.progress * 100)}%</span>`.value,
    );
}
