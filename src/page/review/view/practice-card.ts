import { html, type SafeHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { commentKey, type CommentPart } from '#page/review/comment/markup.ts';
import { squareToken } from '#page/review/comment/tokens.ts';
import { liveDigest } from '#page/review/live/judging.ts';
import { dueEntries, storedRepertoire } from '#page/review/practice/repertoire.ts';
import { type PracticeStatus, practiceStatus } from '#page/review/practice/status.ts';
import { targetAt } from '#page/review/practice/verdict.ts';
import type { Session } from '#page/review/session.ts';
import { type IconName, svgIcon } from './markup.ts';
import { lossesOf, practiceHints } from './practice.ts';
import { bookSource, judged, type Spoken } from './practice-spoken.ts';
import { practiceWords } from './practice-words.ts';
import { type RetryHint, retryHint } from './retry-hint.ts';

// Where practice stands, and what the coach says of it, for its card
// (view/practice-bubble.ts) to draw.

export interface Card {
  readonly status: PracticeStatus;
  readonly spoken: Spoken;
  readonly hint: RetryHint | null;
  /** What the coach says, or once asked for, the hints alone. */
  readonly parts: readonly CommentPart[];
  /** How many of `parts` are hints. */
  readonly hints: number;
}

/** The hint asked for on the user's turn, from the move the coach looks for there. */
function hintOf(session: Session, analysis: Analysis, status: PracticeStatus): RetryHint | null {
  const { practice } = session.view;
  if (status.kind !== 'yours' || !practice) return null;
  const target = targetAt(practice, analysis, analysis.path);
  return retryHint(analysis.node.fen, target?.uci ?? null, practiceHints(session, analysis));
}

function hintWords(session: Session, hint: RetryHint | null): string[] {
  if (!hint) return [];
  const { retry } = session.language.ui;
  const piece = retry.hintPiece(hint.piece);
  return hint.square === null
    ? [piece]
    : [piece, retry.hintSquare(squareToken(hint.square), hint.piece)];
}

/** Where practice stands and what the coach says of it; null once the board has left it. */
export function practiceCard(session: Session, analysis: Analysis): Card | null {
  const { practice } = session.view;
  if (!practice) return null;
  const spoken = { session, analysis, practice, source: bookSource(practice.source) };
  const status = practiceStatus(practice, analysis, lossesOf(session, analysis));
  if (status.kind === 'left') return null;
  const hint = hintOf(session, analysis, status);
  const said = hintWords(session, hint).map(text => ({ text, droppable: false }));
  // A hint takes the words' place: the card then says only what the user asked for.
  return {
    status,
    spoken,
    hint,
    parts: said.length > 0 ? said : practiceWords(spoken, status),
    hints: said.length,
  };
}

/** The positions to review, due now, both sides together: the daily review mixes them. */
export const dueCount = (): number => dueEntries(storedRepertoire(), Date.now()).length;

/** What the card shows, to draw it again only when that changes. */
export function practiceKey(session: Session, analysis: Analysis): string {
  const card = practiceCard(session, analysis);
  if (!card) return '';
  const { practice, round } = session.view;
  return [
    card.status.kind,
    practice?.side,
    practice?.streak,
    dueCount(),
    round ? [round.kind, round.index, round.played, round.clean, round.over].join(',') : '',
    commentKey(card.parts),
    analysis.explorer?.failing,
    liveDigest(judged(card.spoken, analysis.path)),
  ].join('|');
}

/** A button of the row under the card, as the review's Explain / Best / Next; `main` is the way on. */
export const navButton = (action: string, icon: IconName, label: string, main = false): SafeHtml =>
  html`<button class="ln-ext-btn${main ? ' ln-ext-btn--green' : ''}" data-ln-ext="${action}">${svgIcon(icon)}<span>${label}</span></button>`;
