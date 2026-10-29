import { html, type SafeHtml } from '#shared/html.ts';
import { CLASS_COLORS, LIST_BADGES } from '#page/review/classes/classes.ts';
import { classSvg } from '#page/review/classes/icon-svg.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { Division } from '#page/review/rating/phases.ts';
import { costShare } from '#page/review/view/move-list.ts';
import { openingName, phaseStarts } from '#page/review/view/phases.ts';

// The demo's move list: a row per move number, White's move then Black's,
// each with its class's badge where the review's list has one, its move in
// the class's color and the bar of what it gave away; each phase named over
// the row it starts on; without a division, Lichess's own list, bare. The
// notation is Lichess's own: its figurine font draws a piece's letter as the
// piece (demo-moves.css).

/** Lichess's own list (the Moves tab) has none of the review's marks. */
function moveButton(move: MoveVerdict | undefined, lastBook: number, plain: boolean): SafeHtml {
  if (!move) return html`<span></span>`;
  const badged =
    !plain &&
    LIST_BADGES.has(move.moveClass) &&
    (move.moveClass !== 'book' || move.ply === lastBook);
  const cost = plain ? null : costShare(move.loss);
  const style = [
    `--class-color:${CLASS_COLORS[move.moveClass]}`,
    cost === null ? '' : `--cost:${cost}`,
  ].join(';');
  return html`<button type="button" class="demo-move${badged ? ' demo-move--badged' : ''}${cost === null ? '' : ' demo-move--cost'}" data-ply="${move.ply}" style="${style}">${badged ? html`<span class="demo-move__icon">${classSvg(move.moveClass)}</span>` : ''}<span class="demo-move__san${/^[KQRBN]/.test(move.san) ? ' demo-move__san--piece' : ''}">${move.san}</span></button>`;
}

/** Each row's phase name, by row, as the review's list names them (view/move-list-phases.ts). */
function rowPhases(division: Division): Map<number, string> {
  const names = new Map<number, string>();
  // A move is of the phase of the position it's played from: its index in the list.
  for (const { index, name } of phaseStarts(division)) names.set(Math.floor(index / 2), name);
  if (names.size > 0 && !names.has(0)) names.set(0, openingName());
  return names;
}

export function movesMarkup(moves: readonly MoveVerdict[], division: Division | null): SafeHtml {
  const plain = division === null;
  const lastBook = moves.findLast(move => move.moveClass === 'book')?.ply ?? -1;
  const phases = division ? rowPhases(division) : new Map<number, string>();
  const rows: SafeHtml[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    const phase = phases.get(i / 2);
    if (phase) rows.push(html`<li class="demo-moves__phase">${phase}</li>`);
    rows.push(
      html`<li><span class="demo-moves__number">${i / 2 + 1}.</span>${moveButton(moves[i], lastBook, plain)}${moveButton(moves[i + 1], lastBook, plain)}</li>`,
    );
  }
  return html`<ol class="demo-moves__list">${rows}</ol>`;
}
