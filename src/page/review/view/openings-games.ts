import { html, type SafeHtml } from '#shared/html.ts';
import { sanMarkup } from '#page/review/comment/title.ts';
import type { GameDrill } from '#page/review/practice/games.ts';
import { linePgn } from '#page/review/practice/openings.ts';
import type { Session } from '#page/review/session.ts';
import { lineOf } from './openings-cards.ts';
import { miniBoard } from './mini-board.ts';
import { pageCoach } from './openings-setup.ts';
import { navButton } from './practice-card.ts';

// The page of the user's games: the habits their last games show, a card
// each, to drill one or all of them.

function drillCard(session: Session, drill: GameDrill, index: number): SafeHtml {
  const { home } = session.language.ui.practice.page;
  const line = lineOf(drill.name, drill.moves);
  const board = line ? miniBoard({ fen: line.placement, lastMove: line.lastMove }, drill.side) : '';
  const habit = html`<b>${sanMarkup(drill.habit)}</b>`;
  return html`<button class="ln-ext-opening-card ln-ext-drill" data-ln-ext="practice-drill" data-ln-ext-value="${index}">
      <span class="ln-ext-opening-card__board">${board}</span>
      <span class="ln-ext-opening-card__text">
        <span class="ln-ext-opening-card__tags"><span class="ln-ext-drill__why" data-ln-ext-why="${drill.why}">${home.drillWhy[drill.why]}</span></span>
        <span class="ln-ext-opening-card__name">${drill.name}</span>
        <span class="ln-ext-opening-card__moves">${linePgn(drill.moves)}</span>
        <span class="ln-ext-drill__habit">${habit} · ${home.drillCard(drill.times, drill.games)}</span>
      </span>
    </button>`;
}

export function gamesPage(session: Session): SafeHtml {
  const { home } = session.language.ui.practice.page;
  const { games } = session.view.openings;
  if (games.state !== 'done') {
    const words = { idle: home.gamesLoading, loading: home.gamesLoading, failed: home.gamesFailed }[
      games.state
    ];
    return pageCoach(session, { title: home.gamesTitle, words });
  }
  if (games.value.length === 0)
    return pageCoach(session, { title: home.gamesTitle, words: home.gamesNone });
  const button = navButton('practice-drills', 'arrow', home.drillsStart, true);
  return html`${pageCoach(session, { title: home.gamesTitle, words: home.gamesWhy, button })}<div class="ln-ext-review__body ln-ext-openings">
      <div class="ln-ext-openings__grid">${games.value.map((drill, i) => drillCard(session, drill, i))}</div>
    </div>`;
}
