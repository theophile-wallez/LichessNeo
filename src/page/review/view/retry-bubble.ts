import { html, type SafeHtml } from '#shared/html.ts';
import { classIcon } from '#page/review/classes/icon-svg.ts';
import { type CommentPart, commentMarkup, wordCount } from '#page/review/comment/markup.ts';
import { moveToken, squareToken } from '#page/review/comment/tokens.ts';
import type { RetryState, Session } from '#page/review/session.ts';
import { svgIcon } from './markup.ts';
import type { RetryOutcome } from './retry.ts';
import { HINTS, type RetryHint } from './retry-hint.ts';

// What the coach says while the player retries an error, its hints, and the
// retry's buttons. The coach types it out as it does its comments: its line
// on top, then each hint asked for.

export interface Retried {
  readonly retry: RetryState;
  readonly outcome: RetryOutcome;
  readonly hint: RetryHint | null;
}

function line(session: Session, { retry, outcome }: Retried): string {
  const { retry: strings } = session.language.ui;
  const color = retry.move.color;
  if (outcome.kind === 'waiting') return strings.prompt(color);
  if (outcome.kind === 'checking') return strings.checking;
  if (outcome.kind === 'same') return strings.same;
  if (outcome.kind === 'wrong') return strings.wrong(moveToken(outcome.tried.san, color));
  const token = moveToken(outcome.san, color);
  if (outcome.kind === 'revealed') return strings.revealed(token);
  return outcome.best ? strings.found(token) : strings.alsoGood(token);
}

/** The hints asked for, the piece first, then its square: each stays said. */
function hintLines(session: Session, hint: RetryHint | null): string[] {
  if (!hint) return [];
  const { retry: strings } = session.language.ui;
  const piece = strings.hintPiece(hint.piece);
  return hint.square === null ? [piece] : [piece, strings.hintSquare(squareToken(hint.square))];
}

/** What the coach says while retrying, in the order it types it. */
export const retryParts = (session: Session, retried: Retried): CommentPart[] =>
  [line(session, retried), ...hintLines(session, retried.hint)].map(text => ({
    text,
    droppable: false,
  }));

/** Each part as far as the typing has got: the words before it count against it. */
function typed(session: Session, parts: readonly CommentPart[]): SafeHtml[] {
  const { language } = session;
  const { state } = session.stream;
  return parts.map((part, i) =>
    commentMarkup([part], {
      stream: { ...state, shown: state.shown - wordCount(parts.slice(0, i), language) },
      language,
    }),
  );
}

function icon(outcome: RetryOutcome): SafeHtml | string {
  if (outcome.kind === 'wrong') return classIcon(outcome.tried.moveClass);
  if (outcome.kind === 'found') return classIcon(outcome.best ? 'best' : 'excellent');
  return outcome.kind === 'revealed' ? classIcon('best') : '';
}

function buttons(session: Session, { retry, outcome }: Retried): SafeHtml {
  const done = outcome.kind === 'found' || outcome.kind === 'revealed';
  if (done) return html``;
  const { retry: strings } = session.language.ui;
  const hint =
    retry.hints >= HINTS
      ? ''
      : html`<button class="ln-ext-bubble__line" data-ln-ext="hint">${svgIcon('hint')}${retry.hints === 0 ? strings.hint : strings.another}</button>`;
  return html`${hint}<button class="ln-ext-bubble__line" data-ln-ext="reveal">${svgIcon('bulb')}${strings.reveal}</button>`;
}

/** The bubble while retrying: where the retry stands, its hints, its buttons. */
export function retryBubble(session: Session, retried: Retried): SafeHtml {
  const [said, ...hints] = typed(session, retryParts(session, retried));
  const subs = hints.map(hint => html`<p class="ln-ext-bubble__sub">${hint}</p>`);
  return html`<div class="ln-ext-bubble__row ln-ext-bubble__row--retry">${icon(retried.outcome)}
      <p class="ln-ext-bubble__title">${said ?? ''}</p></div>
    <div class="ln-ext-bubble__body">${subs}
      <div class="ln-ext-bubble__actions">${buttons(session, retried)}</div></div>`;
}
