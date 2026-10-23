import { fenTurn } from '#shared/chess/fen.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { pathPrefixes } from '#page/lichess/tree.ts';
import { sanMarkup } from '#page/review/comment/title.ts';
import type { PracticeStrings } from '#page/review/i18n/practice-types.ts';
import { ideaOf } from '#page/review/practice/ideas.ts';
import { bookAt, inLine, type PracticeState } from '#page/review/practice/state.ts';
import { openingAt } from '#page/review/practice/status.ts';
import { ratingAt } from '#page/review/practice/verdict.ts';
import { svgIcon } from './markup.ts';

// The line practiced so far, under the coach: the opening it has reached, its
// idea, and each move with how common the book finds it. The moves before
// practice started are the opening's own, and only stand there.

interface LineMove {
  readonly ply: number;
  readonly cell: SafeHtml;
}

function moveCell(
  practice: PracticeState,
  analysis: Analysis,
  path: string,
  strings: PracticeStrings,
): SafeHtml {
  const { page } = strings;
  const node = analysis.nodeAtPath(path);
  const san = html`<b>${sanMarkup(node.san ?? '')}</b>`;
  if (!inLine(practice, path))
    return html`<span class="ln-ext-oline__move" data-ln-ext-kind="theory">${san}</span>`;
  const rating = ratingAt(practice, analysis, path);
  const mine = fenTurn(node.fen) !== practice.side;
  // A book of the line's own has no shares worth showing.
  if (!rating || practice.own)
    return html`<span class="ln-ext-oline__move"${mine ? html` data-ln-ext-mine` : ''}>${san}</span>`;
  const share = rating.kind === 'out' ? '' : page.share(rating.share);
  const tip = share ? `${page.kindNames[rating.kind]} · ${share}` : page.kindNames[rating.kind];
  return html`<span class="ln-ext-oline__move" data-ln-ext-kind="${rating.kind}"${mine ? html` data-ln-ext-mine` : ''} data-ln-ext-tip="${tip}">${san}${share ? html`<small>${share}</small>` : ''}</span>`;
}

/** The moves paired by number, White's first: a line starting on Black's move leaves White's cell empty. */
function rows(moves: readonly LineMove[]): SafeHtml[] {
  const byNumber = new Map<number, SafeHtml[]>();
  for (const { ply, cell } of moves) {
    const number = Math.ceil(ply / 2);
    const row = byNumber.get(number) ?? (ply % 2 === 0 ? [html`<span></span>`] : []);
    row.push(cell);
    byNumber.set(number, row);
  }
  return [...byNumber].map(
    ([number, cells]) =>
      html`<li class="ln-ext-oline__row"><span class="ln-ext-oline__num">${number}.</span>${cells}</li>`,
  );
}

/** The opening's idea, the user's plan or the other side's. */
function ideaBox(practice: PracticeState, name: string, strings: PracticeStrings): SafeHtml | '' {
  const idea = ideaOf(strings.ideas, name);
  if (!idea) return '';
  const { home } = strings.page;
  const label = idea.side === practice.side ? home.yourPlan : home.theirPlan;
  return html`<p class="ln-ext-openings__idea" data-ln-ext-plan="${idea.side === practice.side ? 'yours' : 'theirs'}">${svgIcon('plan')}<span><b>${label}</b> ${idea.text}</span></p>`;
}

export function lineMarkup(
  practice: PracticeState,
  analysis: Analysis,
  strings: PracticeStrings,
): SafeHtml {
  const moves = pathPrefixes(analysis.path).map(path => ({
    ply: analysis.nodeAtPath(path).ply,
    cell: moveCell(practice, analysis, path, strings),
  }));
  const started = bookAt(practice, analysis.nodeAtPath(practice.start).fen)?.opening ?? '';
  const name = openingAt(practice, analysis, analysis.path) || practice.opening || started;
  return html`${name ? html`<p class="ln-ext-openings__name">${name}</p>` : ''}
    ${name ? ideaBox(practice, name, strings) : ''}
    <h3 class="ln-ext-openings__heading">${strings.page.line}</h3>
    <ol class="ln-ext-oline">${rows(moves)}</ol>`;
}
