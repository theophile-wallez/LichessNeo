import { avatarAttributes } from '#shared/avatar.ts';
import type { Color } from '#shared/chess/types.ts';
import { queryOne } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml, trustedHtml } from '#shared/html.ts';
import type { Analysis, Player } from '#page/lichess/analysis.ts';
import {
  CLASS_COLORS,
  MOVE_CLASSES,
  type MoveClass,
  SUMMARY_ROWS,
} from '#page/review/classes/classes.ts';
import { classIcon } from '#page/review/classes/icon-svg.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import { PHASES, type Phase } from '#page/review/rating/phases.ts';
import type { Review, Session } from '#page/review/session.ts';
import { mountGraph } from './graph.ts';
import { learnLabel } from './learn.ts';
import { CHEVRON_ICON, header } from './markup.ts';

// The summary: the graph, each side's accuracy and counts, and the game
// rating. It keeps its layout while the game is analyzed, filling in from
// the quick pass's draft, then at full depth.

const NBSP = trustedHtml('&nbsp;');

// Both tables share fixed columns, so the scrolling one lines up.
const COLUMNS = trustedHtml(
  '<colgroup><col class="cdc-t-c-label"><col><col class="cdc-t-c-icon"><col></colgroup>',
);

export function playerName(player: Player | undefined, language: ReviewLanguage): string {
  if (player?.user?.username) return player.user.username;
  if (player?.name) return player.name;
  return player?.ai ? `Stockfish ${player.ai}` : language.ui.anonymous;
}

export interface SummaryInput {
  readonly review: Review | null;
  readonly error: string | null;
  readonly allRows: boolean;
  readonly players: Readonly<Record<Color, Player | undefined>>;
  readonly language: ReviewLanguage;
  /** "Learn from your mistakes", when the exercise can start. */
  readonly learn: string | null;
}

// A count goes to its moves once they're all judged at full depth: until
// then it's the draft's, which may not match the moves it would go to.
function countCell(
  { review, language }: SummaryInput,
  color: Color,
  moveClass: MoveClass,
): SafeHtml {
  const count = review?.counts[color][moveClass] ?? 0;
  const tip = language.countTip(color, moveClass, count);
  const shown =
    review?.complete && count > 0
      ? html`<button class="cdc-t-jump" data-cdc="jump" data-cdc-color="${color}" data-cdc-class="${moveClass}" aria-label="${tip}">${count}</button>`
      : count;
  return html`<td class="cdc-t-num" style="color:${CLASS_COLORS[moveClass]}">${shown}</td>`;
}

function countRows(input: SummaryInput): SafeHtml[] {
  const { review, allRows, language } = input;
  const brilliant =
    (review?.counts.white.brilliant ?? 0) > 0 || (review?.counts.black.brilliant ?? 0) > 0;
  return MOVE_CLASSES.filter(
    moveClass => allRows || SUMMARY_ROWS.has(moveClass) || (moveClass === 'brilliant' && brilliant),
  ).map(
    moveClass => html`<tr><td class="cdc-t-label">${language.classLabels[moveClass]}</td>
        ${countCell(input, 'white', moveClass)}
        <td class="cdc-t-icon">${classIcon(moveClass)}</td>
        ${countCell(input, 'black', moveClass)}</tr>`,
  );
}

function moreToggle({ allRows, language }: SummaryInput): SafeHtml {
  const label = allRows ? language.ui.less : language.ui.more;
  return html`<tr class="cdc-t-more"><td colspan="4"><button class="cdc-review__more${allRows ? ' cdc-review__more--open' : ''}" data-cdc="rows" data-cdc-tip="${label}" aria-label="${label}" aria-expanded="${String(allRows)}">${CHEVRON_ICON}</button></td></tr>
      <tr class="cdc-t-sep"><td colspan="4"></td></tr>`;
}

// The rating each side played at, then a verdict per phase as the icon of the
// class it deserves. Once the game is rated, phases it never reached are left out.
function ratingRows({ review, language }: SummaryInput): SafeHtml {
  const { ui } = language;
  const rating = review?.rating;
  const elo = (color: Color): SafeHtml | number => rating?.[color]?.elo ?? NBSP;
  const phase = (color: Color, name: Phase): SafeHtml | '' => {
    const verdict = rating?.[color]?.phases[name];
    return verdict ? classIcon(verdict) : '';
  };
  const phases = PHASES.filter(
    name => !rating || Boolean(rating.white?.phases[name] ?? rating.black?.phases[name]),
  ).map(
    name =>
      html`<tr class="cdc-t-phase"><td class="cdc-t-label">${ui.phases[name]}</td><td>${phase('white', name)}</td><td></td><td>${phase('black', name)}</td></tr>`,
  );
  return html`<tr class="cdc-t-rating"><td class="cdc-t-label"><span data-cdc-tip="${ui.gameRatingTip}">${ui.gameRating}</span></td>
        <td><span class="cdc-acc cdc-acc--w">${elo('white')}</span></td><td></td>
        <td><span class="cdc-acc cdc-acc--b">${elo('black')}</span></td></tr>
      <tr class="cdc-t-sep"><td colspan="4"></td></tr>
      ${phases}`;
}

function topMarkup(input: SummaryInput): SafeHtml {
  const { review, error, players, language } = input;
  const { ui } = language;
  const accuracy = (color: Color): SafeHtml | string => {
    const value = review?.accuracy[color];
    return value === null || value === undefined ? NBSP : value.toFixed(1);
  };
  const white = playerName(players.white, language);
  const black = playerName(players.black, language);
  return html`<div class="cdc-review__top">
        ${error ? html`<p class="cdc-review__error">${error}</p>` : ''}
        <div class="cdc-review__graph cdc-summary-graph"></div>
        <table class="cdc-review__table">${COLUMNS}
          <tr class="cdc-t-names"><td></td><td title="${white}">${white}</td><td></td><td title="${black}">${black}</td></tr>
          <tr><td class="cdc-t-label">${ui.players}</td><td><span class="cdc-avatar cdc-avatar--w"${avatarAttributes(players.white?.user?.username)}></span></td><td></td><td><span class="cdc-avatar cdc-avatar--b"${avatarAttributes(players.black?.user?.username)}></span></td></tr>
          <tr><td class="cdc-t-label">${ui.accuracy}</td>
            <td><span class="cdc-acc cdc-acc--w">${accuracy('white')}</span></td><td></td>
            <td><span class="cdc-acc cdc-acc--b">${accuracy('black')}</span></td></tr>
          <tr class="cdc-t-sep"><td colspan="4"></td></tr>
        </table>
      </div>`;
}

function summaryMarkup(input: SummaryInput): SafeHtml {
  const { review, error, language, learn } = input;
  const loading = !review?.complete && !error;
  const canStart = review !== null && !error;
  return html`${header(language.ui.review, 'normal', language)}
      ${topMarkup(input)}
      <div class="cdc-review__body">
        <table class="cdc-review__table${loading ? ' cdc-review__table--loading' : ''}">${COLUMNS}${countRows(input)}${moreToggle(input)}${ratingRows(input)}</table>
      </div>
      <div class="cdc-review__foot"><button class="cdc-btn cdc-btn--green" data-cdc="moves" ${canStart ? '' : 'disabled'}>${language.ui.start}</button>${learn === null ? '' : html`<button class="cdc-btn cdc-review__learn" data-cdc="learn">${learn}</button>`}</div>`;
}

export function renderSummary(session: Session, analysis: Analysis): void {
  const { view, language, elements } = session;
  const { review, error } = view;
  setHtml(
    elements.panel,
    summaryMarkup({
      review,
      error,
      allRows: view.allRows,
      players: analysis.players(),
      language,
      learn: learnLabel(analysis),
    }),
  );
  const graph = queryOne(elements.panel, '.cdc-summary-graph', HTMLElement);
  if (!graph) return;
  if (review) mountGraph(session, analysis, { container: graph, kind: 'summary' });
  if (!review?.complete && !error)
    graph.insertAdjacentHTML(
      'afterbegin',
      html`<span class="cdc-summary-pct">${Math.round(view.progress * 100)}%</span>`.value,
    );
}
