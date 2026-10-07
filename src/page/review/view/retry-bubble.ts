import { html, type SafeHtml } from '#shared/html.ts';
import { classIcon } from '#page/review/classes/icon-svg.ts';
import { commentMarkup } from '#page/review/comment/markup.ts';
import { moveToken } from '#page/review/comment/tokens.ts';
import type { RetryState, Session } from '#page/review/session.ts';
import { svgIcon } from './markup.ts';
import type { RetryOutcome } from './retry.ts';

// What the coach says while the player retries an error, and the retry's buttons.

const SHOWN = { key: '', shown: Infinity, dropped: false };

/** A line of the coach's, its moves drawn as chips. */
function said(session: Session, text: string): SafeHtml {
  const { language } = session;
  return commentMarkup([{ text, droppable: false }], { stream: SHOWN, language });
}

function title(session: Session, retry: RetryState, outcome: RetryOutcome): SafeHtml {
  const { retry: strings } = session.language.ui;
  const color = retry.move.color;
  if (outcome.kind === 'waiting') return said(session, strings.prompt(color));
  if (outcome.kind === 'checking') return said(session, strings.checking);
  if (outcome.kind === 'same') return said(session, strings.same);
  if (outcome.kind === 'wrong')
    return said(session, strings.wrong(moveToken(outcome.tried.san, color)));
  const token = moveToken(outcome.san, color);
  if (outcome.kind === 'revealed') return said(session, strings.revealed(token));
  return said(session, outcome.best ? strings.found(token) : strings.alsoGood(token));
}

function icon(outcome: RetryOutcome): SafeHtml | string {
  if (outcome.kind === 'wrong') return classIcon(outcome.tried.moveClass);
  if (outcome.kind === 'found') return classIcon(outcome.best ? 'best' : 'excellent');
  return outcome.kind === 'revealed' ? classIcon('best') : '';
}

/** The bubble while retrying. */
export function retryBubble(session: Session, retry: RetryState, outcome: RetryOutcome): SafeHtml {
  const done = outcome.kind === 'found' || outcome.kind === 'revealed';
  const { ui } = session.language;
  const reveal = done
    ? ''
    : html`<button class="cdc-bubble__line" data-cdc="reveal">${svgIcon('bulb')}${ui.retry.reveal}</button>`;
  return html`<div class="cdc-bubble__row cdc-bubble__row--retry">${icon(outcome)}
      <p class="cdc-bubble__title">${title(session, retry, outcome)}</p></div>
    <div class="cdc-bubble__body"><div class="cdc-bubble__actions">${reveal}</div></div>`;
}
