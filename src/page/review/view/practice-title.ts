import { html, type SafeHtml } from '#shared/html.ts';
import { parentPath } from '#page/lichess/tree.ts';
import { isError, type MoveClass } from '#page/review/classes/classes.ts';
import { pickBy } from '#page/review/coach/said.ts';
import { moveTitle } from '#page/review/comment/title.ts';
import { lossClass } from '#page/review/judge/judge.ts';
import { moveKey, type Played } from '#page/review/practice/state.ts';
import { targetAt } from '#page/review/practice/verdict.ts';
import type { Card } from './practice-card.ts';
import { type RoundCard, roundCard } from './practice-round-card.ts';
import { judged } from './practice-spoken.ts';

// The card's title and the coach's verdict on the user's move: the book's
// word on it, the engine's error if it is one, and the modes' own titles.

/** The engine's error in the move to `path`; a dubious book move's, by what it loses. */
function engineError(card: Card, path: string, isDubious: boolean): MoveClass | null {
  const verdict = judged(card.spoken, path);
  if (!verdict) return null;
  // The engine judges a book move as such, never as an error.
  const moveClass = isDubious ? lossClass(verdict.loss) : verdict.moveClass;
  return isError(moveClass) ? moveClass : null;
}

/** The user's move the card speaks of, and the coach's verdict on it. */
export function verdictOf(card: Card): { played: Played | null; moveClass: MoveClass | null } {
  const { status } = card;
  if (status.kind === 'end') return { played: status.played, moveClass: 'book' };
  if (status.kind === 'looking' || status.kind === 'left') return { played: null, moveClass: null };
  // Once a refused move is taken back, the card is about finding another.
  if (status.kind === 'yours' && status.miss) return { played: null, moveClass: null };
  const { played } = status;
  if (!played) return { played, moveClass: null };
  const refused = status.kind === 'refused';
  const error = engineError(card, played.path, refused && status.why === 'dubious');
  // A refused move may be fine to the engine: no verdict but its error, if it is one.
  return { played, moveClass: refused ? error : (error ?? 'book') };
}

/** A move refused or turned down in a mode: the challenge's answer, the user's habit, not their move. */
function moveModeTitle(card: Card): SafeHtml | null {
  const { status, spoken } = card;
  const { session, analysis, practice } = spoken;
  const { language } = session;
  const { modes } = language.ui.practice;
  if (status.kind === 'deviated')
    return moveTitle(modes.deviatedTitle, status.played.san, language);
  if (status.kind !== 'refused') return null;
  if (roundCard(session)?.kind === 'blitz') {
    const target = targetAt(practice, analysis, parentPath(status.played.path));
    return moveTitle(modes.blitzMissed, target?.san ?? '', language);
  }
  if (status.why === 'aim')
    return html`${pickBy(language.ui.practice.tryAgain, status.played.path)}`;
  return status.why === 'habit' ? moveTitle(modes.habitTitle, status.played.san, language) : null;
}

/** A round's card done: found, punished, fixed; the challenge names the next. */
function endTitle(card: Card, kind: RoundCard['kind']): SafeHtml | null {
  const { modes } = card.spoken.session.language.ui.practice;
  const key = `end|${card.spoken.analysis.path}`;
  if (kind === 'review') return html`${pickBy(modes.reviewFound, key)}`;
  if (kind === 'trap') return html`${pickBy(modes.trapDone, key)}`;
  return kind === 'games' ? html`${pickBy(modes.gamesDone, key)}` : null;
}

/** A round's card before the user's first move: a trap's, or the opening the card names. */
function roundTitle(card: Card, played: Played | null): SafeHtml | null {
  const { status, spoken } = card;
  const round = roundCard(spoken.session);
  if (!round) return null;
  const { modes } = spoken.session.language.ui.practice;
  if (status.kind === 'end') return endTitle(card, round.kind);
  if (played) return null;
  if (round.kind === 'trap')
    return html`${status.kind === 'replying' ? modes.trapWatch : modes.trapTitle}`;
  if (status.kind !== 'yours' || status.miss) return null;
  if (round.kind === 'review') return html`${round.entry.name}`;
  return round.kind === 'blitz' ? html`${round.card.name}` : null;
}

/** A move out of the book, or played on request: as the line's book names it. */
function bookTitle(card: Card, played: Played): SafeHtml | null {
  const { practice, session } = card.spoken;
  const { language } = session;
  const { practice: strings } = language.ui;
  const own = practice.own?.kind;
  if (played.rating?.kind === 'out') {
    const ownBook = own === 'study' || own === 'repertoire';
    return moveTitle(
      ownBook ? strings.modes.ownOutTitle(own) : strings.outTitle,
      played.san,
      language,
    );
  }
  if (!practice.revealed.has(moveKey(parentPath(played.path), played.san))) return null;
  const theirs = practice.own !== null || practice.aims !== null;
  return moveTitle(
    theirs ? strings.modes.revealedTitle : strings.revealedTitle,
    played.san,
    language,
  );
}

/** The card's title: the modes' own, else the line's end, a try again, or the verdict on the move. */
export function titleOf(card: Card, played: Played | null): SafeHtml {
  const { status, spoken } = card;
  const { language } = spoken.session;
  const { practice: strings } = language.ui;
  const mode = moveModeTitle(card) ?? roundTitle(card, played);
  if (mode) return mode;
  if (status.kind === 'end')
    return html`${pickBy(status.reason === 'length' ? strings.doneTitle : strings.endTitle, spoken.analysis.path)}`;
  if (status.kind === 'yours' && status.miss)
    return html`${pickBy(strings.tryAgain, `${status.miss.played.path}|${status.miss.tries}`)}`;
  if (!played) return html`${strings.side(spoken.practice.side)}`;
  if (status.kind === 'refused' && status.why === 'dubious')
    return moveTitle(strings.dubiousTitle, played.san, language);
  const verdict = bookTitle(card, played);
  if (verdict) return verdict;
  const kind = played.rating?.kind;
  const sentence = kind && kind !== 'out' ? strings.kinds[kind] : language.classSentences.book;
  return moveTitle(sentence, played.san, language);
}
