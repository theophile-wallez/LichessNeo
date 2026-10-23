import type { Color } from '#shared/chess/types.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { sanMarkup } from '#page/review/comment/title.ts';
import { isFavorite } from '#page/review/practice/progress.ts';
import { storedRepertoire } from '#page/review/practice/repertoire.ts';
import { repertoireRows, type TreeRow } from '#page/review/practice/repertoire-tree.ts';
import type { Session } from '#page/review/session.ts';
import { svgIcon } from './markup.ts';
import { masteryChip } from './openings-cards.ts';

// The user's repertoire as a tree on its page: a row per run of moves, the
// user's own in bold, how well they know it, and what to do with it: practice
// it, star it, or remove it with all that follows. Rows past the first level
// unfold on demand.

/** A move's number: White's, and Black's when a row starts on it. */
function moveNumber(ply: number, first: boolean): string {
  if (ply % 2 === 0) return `${ply / 2 + 1}.`;
  return first ? `${(ply + 1) / 2}…` : '';
}

/** The moves of a row, numbered from where it starts: "2… Nc6 3. Bc4". */
function numbered(from: number, moves: readonly string[], side: Color): SafeHtml[] {
  return moves.map((san, i) => {
    const ply = from + i;
    const number = moveNumber(ply, i === 0);
    const mine = (ply % 2 === 0) === (side === 'white');
    const move = mine ? html`<b>${sanMarkup(san)}</b>` : sanMarkup(san);
    return html`${number ? html`<span class="ln-ext-rtree__num">${number}</span>` : ''}<span class="ln-ext-rtree__move">${move}</span>`;
  });
}

const keyOf = (row: TreeRow): string => [...row.from, ...row.moves].join(' ');

/** Rows of the first level show their branches until folded; deeper ones once unfolded. */
const isOpen = (session: Session, row: TreeRow, depth: number): boolean =>
  depth < 1 !== session.view.openings.unfolded.has(keyOf(row));

function actions(session: Session, row: TreeRow): SafeHtml {
  const { home } = session.language.ui.practice.page;
  const { side, pruning } = session.view.openings;
  const end = keyOf(row);
  const starred = isFavorite(`${side}|${end}`);
  const first = row.moves[0] ?? '';
  const armed = pruning === `${row.from.join(' ')}|${first}`;
  return html`<span class="ln-ext-rtree__actions">
      <button class="ln-ext-rtree__act" data-ln-ext="practice-tree-line" data-ln-ext-moves="${row.from.join(' ')}" data-ln-ext-tip="${home.practiceLine}" aria-label="${home.practiceLine}">${svgIcon('play')}</button>
      <button class="ln-ext-rtree__act" data-ln-ext="practice-star" data-ln-ext-moves="${end}"${starred ? html` aria-pressed="true"` : ''} data-ln-ext-tip="${starred ? home.unstar : home.star}" aria-label="${starred ? home.unstar : home.star}">${svgIcon('star')}</button>
      <button class="ln-ext-rtree__act ln-ext-rtree__act--prune" data-ln-ext="practice-prune" data-ln-ext-moves="${row.from.join(' ')}" data-ln-ext-value="${first}"${armed ? html` data-ln-ext-armed` : ''} data-ln-ext-tip="${armed ? home.pruneConfirm : home.prune}" aria-label="${home.prune}">${svgIcon('prune')}</button>
    </span>`;
}

function rowsMarkup(session: Session, rows: readonly TreeRow[], depth: number): SafeHtml[] {
  const { side } = session.view.openings;
  return rows.map(row => {
    const open = row.rows.length > 0 && isOpen(session, row, depth);
    const toggle =
      row.rows.length > 0
        ? html`<button class="ln-ext-rtree__toggle" data-ln-ext="practice-tree-toggle" data-ln-ext-moves="${keyOf(row)}" aria-expanded="${String(open)}">${svgIcon('next')}</button>`
        : html`<span class="ln-ext-rtree__toggle"></span>`;
    return html`<li class="ln-ext-rtree__item"><div class="ln-ext-rtree__row">${toggle}<span class="ln-ext-rtree__moves">${numbered(row.from.length, row.moves, side)}</span>${masteryChip(session, row.mastery)}${actions(session, row)}</div>${open ? html`<ul class="ln-ext-rtree__rows">${rowsMarkup(session, row.rows, depth + 1)}</ul>` : ''}</li>`;
  });
}

/** The side's repertoire as a tree, or the coach's word on how it fills. */
export function repertoireTree(session: Session): SafeHtml {
  const { side } = session.view.openings;
  const rows = repertoireRows(storedRepertoire(), side);
  if (rows.length === 0)
    return html`<p class="ln-ext-openings__note">${session.language.ui.practice.page.home.treeEmpty}</p>`;
  return html`<ul class="ln-ext-rtree">${rowsMarkup(session, rows, 0)}</ul>`;
}
