import {
  fenTurn,
  isInCheck,
  parseFen,
  squareAt,
  squareCoords,
  attackedSquares,
  type Board,
  type Square,
} from '#shared/chess/index.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import type { Mark } from '#page/board/review-arrows.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { normalizeUci, sanOf } from '#page/review/chess/notation.ts';
import { classSvg } from '#page/review/classes/icon-svg.ts';
import { type CommentPart, commentKey, commentMarkup } from '#page/review/comment/markup.ts';
import { moveToken, squareToken } from '#page/review/comment/tokens.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { svgIcon } from '#page/review/view/markup.ts';
import { HINTS, retryHint } from '#page/review/view/retry-hint.ts';

// Retry, as the review's (view/retry.ts, view/retry-bubble.ts): the board goes
// back before the error, the visitor plays a move by clicking its piece and
// its square, and the coach says whether it's the one, with a hint or two on
// request. Only the engine's own move counts: the demo has no engine to judge
// another one.

export type Outcome =
  | { readonly kind: 'waiting' }
  | { readonly kind: 'wrong'; readonly uci: string; readonly san: string }
  | { readonly kind: 'same'; readonly uci: string }
  | { readonly kind: 'found'; readonly uci: string; readonly san: string }
  | { readonly kind: 'revealed'; readonly uci: string; readonly san: string };

export interface RetryState {
  readonly outcome: Outcome;
  readonly hints: number;
  /** The piece picked to move, before its square. */
  readonly picked: Square | null;
}

export const RETRY_START: RetryState = { outcome: { kind: 'waiting' }, hints: 0, picked: null };

/** A pawn's moves forward: one square, or two from its first rank, onto empty squares. */
function pushes(board: Board, from: Square, white: boolean): Square[] {
  const [file, rank] = squareCoords(from);
  const step = white ? 1 : -1;
  const one = squareAt(file, rank + step);
  if (!one || board.has(one)) return [];
  const two = squareAt(file, rank + 2 * step);
  const first = rank === (white ? 1 : 6);
  return first && two && !board.has(two) ? [one, two] : [one];
}

/** The move from `from` to `to`, in the engine's notation, if the side to move may play it. */
export function moveOn(fen: string, from: Square, to: Square): string | null {
  const { board } = parseFen(fen);
  const turn = fenTurn(fen);
  const piece = board.get(from);
  if (piece?.color !== turn) return null;
  const target = board.get(to);
  const white = turn === 'white';
  const reached =
    piece.role === 'pawn'
      ? [
          ...pushes(board, from, white),
          ...attackedSquares(board, from).filter(square => board.has(square)),
        ]
      : attackedSquares(board, from);
  if (!reached.includes(to) || target?.color === turn) return null;
  const lastRank = squareCoords(to)[1] === (white ? 7 : 0);
  const uci = `${from}${to}${piece.role === 'pawn' && lastRank ? 'q' : ''}`;
  return isInCheck(boardAfter(board, uci), turn) ? null : uci;
}

/** What playing `uci` in place of `move` comes to. */
export function outcomeOf(move: MoveVerdict, uci: string): Outcome {
  const fen = move.previousPosition.fen;
  const same = (one: string, other: string): boolean =>
    normalizeUci(one, fen, false) === normalizeUci(other, fen, false);
  if (same(uci, move.uci)) return { kind: 'same', uci };
  const san = sanOf(fen, uci);
  return move.best && same(uci, move.best)
    ? { kind: 'found', uci, san }
    : { kind: 'wrong', uci, san };
}

/** The retry once `square` is clicked: a piece picked, or a move played; the same when nothing changes. */
export function pickedOn(move: MoveVerdict, retry: RetryState, square: Square): RetryState {
  if (retry.outcome.kind !== 'waiting') return retry;
  const fen = move.previousPosition.fen;
  const uci = retry.picked ? moveOn(fen, retry.picked, square) : null;
  if (uci) return { ...retry, picked: null, outcome: outcomeOf(move, uci) };
  const own = parseFen(fen).board.get(square)?.color === fenTurn(fen);
  const picked = own ? square : null;
  return picked === retry.picked ? retry : { ...retry, picked };
}

function line(move: MoveVerdict, outcome: Outcome, language: ReviewLanguage): string {
  const strings = language.ui.retry;
  const { color } = move;
  if (outcome.kind === 'waiting') return strings.prompt(color);
  if (outcome.kind === 'same') return strings.same;
  if (outcome.kind === 'wrong') return strings.wrong(moveToken(outcome.san, color));
  const token = moveToken(outcome.san, color);
  return outcome.kind === 'revealed' ? strings.revealed(token) : strings.found(token);
}

const hintOf = (move: MoveVerdict, state: RetryState) =>
  retryHint(move.previousPosition.fen, move.best, state.hints);

/** What the coach says, in the order it types it: its line, then each hint asked for. */
export function retryParts(
  move: MoveVerdict,
  state: RetryState,
  language: ReviewLanguage,
): CommentPart[] {
  const hint = hintOf(move, state);
  const strings = language.ui.retry;
  const hints = !hint
    ? []
    : [
        strings.hintPiece(hint.piece),
        ...(hint.square ? [strings.hintSquare(squareToken(hint.square), hint.piece)] : []),
      ];
  return [line(move, state.outcome, language), ...hints].map(text => ({ text, droppable: false }));
}

/** The hint's square, marked while the board waits for a move. */
export const retryMarks = (move: MoveVerdict, state: RetryState): readonly Mark[] =>
  state.outcome.kind === 'waiting' ? (hintOf(move, state)?.marks ?? []) : [];

function buttons(state: RetryState, language: ReviewLanguage): SafeHtml {
  const { kind } = state.outcome;
  if (kind === 'found' || kind === 'revealed') return html``;
  const strings = language.ui.retry;
  const hint =
    state.hints >= HINTS
      ? ''
      : html`<button type="button" class="ln-ext-bubble__line" data-action="hint">${svgIcon('hint')}${state.hints === 0 ? strings.hint : strings.another}</button>`;
  return html`<div class="ln-ext-bubble__actions">${hint}<button type="button" class="ln-ext-bubble__line" data-action="reveal">${svgIcon('bulb')}${strings.reveal}</button></div>`;
}

/** The card while retrying; the words of the first `said` parts already shown. */
export function retryMarkup(
  move: MoveVerdict,
  state: RetryState,
  language: ReviewLanguage,
  said: number,
): SafeHtml {
  const parts = retryParts(move, state, language);
  const [title, ...hints] = parts.map((part, i) =>
    commentMarkup([part], {
      stream: { key: commentKey(parts), shown: i < said ? Infinity : 0, dropped: 0 },
      language,
    }),
  );
  const { kind } = state.outcome;
  const icon = kind === 'found' || kind === 'revealed' ? classSvg('best') : '';
  return html`<div class="demo-say__head">
      ${icon ? html`<span class="demo-say__icon">${icon}</span>` : ''}
      <p class="demo-say__title">${title ?? ''}</p>
    </div>
    ${hints.map(hint => html`<p class="demo-say__words">${hint}</p>`)}
    ${buttons(state, language)}`;
}
