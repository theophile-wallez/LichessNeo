import { writePlacement } from '#shared/chess/fen.ts';
import { playLine } from '#shared/chess/san.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { lineMastery, type MasteryOf } from '#page/review/practice/mastery.ts';
import { linePgn, type OpeningLine } from '#page/review/practice/openings.ts';
import { storedRepertoire } from '#page/review/practice/repertoire.ts';
import type { Session } from '#page/review/session.ts';
import { svgIcon } from './markup.ts';
import { miniBoard } from './mini-board.ts';

// The practice page's cards of openings: a little board of the line, its name
// and moves, its ECO code, and how well the user knows it, as a ring that
// fills as they learn it.

/** How well a line is known: a ring and its level's name, the share found at the first try as its tip. */
export function masteryChip(session: Session, mastery: MasteryOf): SafeHtml | '' {
  if (mastery.mastery === 'new') return '';
  const { home } = session.language.ui.practice.page;
  const tip = home.masteryTip(Math.round(mastery.found * 100), mastery.positions);
  const icon =
    mastery.mastery === 'mastered' ? svgIcon('crown') : html`<i class="ln-ext-mastery__ring"></i>`;
  return html`<span class="ln-ext-mastery" data-ln-ext-mastery="${mastery.mastery}" style="--ln-ext-progress:${mastery.progress.toFixed(2)}" data-ln-ext-tip="${tip}">${icon}${home.masteries[mastery.mastery]}</span>`;
}

/** An opening's card: its board, its name and moves, its ECO code and how well it's known. */
export function openingCard(
  session: Session,
  line: OpeningLine,
  { eco = '', action = 'practice-line' }: { eco?: string; action?: string } = {},
): SafeHtml {
  const { side } = session.view.openings;
  const board = miniBoard({ fen: line.placement, lastMove: line.lastMove }, side);
  const mastery = masteryChip(session, lineMastery(storedRepertoire(), side, line.moves));
  const tags = [
    ...(eco ? [html`<span class="ln-ext-opening-card__eco">${eco}</span>`] : []),
    mastery,
  ].filter(Boolean);
  return html`<button class="ln-ext-opening-card" data-ln-ext="${action}" data-ln-ext-moves="${line.moves.join(' ')}" data-ln-ext-name="${line.name}">
      <span class="ln-ext-opening-card__board">${board}</span>
      <span class="ln-ext-opening-card__text">${tags.length > 0 ? html`<span class="ln-ext-opening-card__tags">${tags}</span>` : ''}<span class="ln-ext-opening-card__name">${line.name}</span>
        <span class="ln-ext-opening-card__moves">${linePgn(line.moves)}</span></span>
    </button>`;
}

export const grid = (cards: readonly SafeHtml[]): SafeHtml =>
  html`<div class="ln-ext-openings__grid">${cards}</div>`;

export const heading = (text: string): SafeHtml =>
  html`<h3 class="ln-ext-openings__heading">${text}</h3>`;

/** A line of moves from the start as an opening's card shows it; null if they can't be played. */
export function lineOf(name: string, moves: readonly string[]): OpeningLine | null {
  const played = playLine(moves);
  if (!played) return null;
  return { name, moves, placement: writePlacement(played.board), lastMove: played.lastMove };
}
