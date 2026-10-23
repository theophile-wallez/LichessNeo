import { pickBy } from '#page/review/coach/said.ts';
import { moveToken } from '#page/review/comment/tokens.ts';
import type { OwnKind, PracticeModeStrings } from '#page/review/i18n/practice-mode-types.ts';
import type { Ways } from '#page/review/i18n/types.ts';
import type { Miss, Played, Refusal } from '#page/review/practice/state.ts';
import type { Answer } from '#page/review/practice/status.ts';
import { roundCard } from './practice-round-card.ts';
import type { Spoken } from './practice-spoken.ts';

// What the coach says in practice's modes, where it says other than on a line
// against the book: a book of the line's own, the daily review, the challenge,
// a trap, a drill of the user's games, and what it cheers.

const modesOf = (spoken: Spoken): PracticeModeStrings => spoken.session.language.ui.practice.modes;

/** The kind of the line's own book the coach names: a study, or the user's repertoire. */
function ownKind(spoken: Spoken): OwnKind | null {
  const kind = spoken.practice.own?.kind;
  return kind === 'study' || kind === 'repertoire' ? kind : null;
}

/** A move of the line's own book: its main line, or another; nothing in a trap or the challenge. */
export function ownPlayedWords(spoken: Spoken, played: Played): string[] | null {
  if (!spoken.practice.own) return null;
  const kind = ownKind(spoken);
  if (!kind || !played.rating?.move) return [];
  const modes = modesOf(spoken);
  return [
    pickBy(played.rating.kind === 'main' ? modes.ownMain(kind) : modes.ownOther(kind), played.path),
  ];
}

/** The trap's mistake, just played: the user's to punish. */
export function trapWords(spoken: Spoken, answer: Answer): string[] | null {
  const { practice } = spoken;
  if (practice.own?.kind !== 'trap' || answer.path.length !== practice.start.length + 2)
    return null;
  const side = practice.side === 'white' ? 'black' : 'white';
  return [pickBy(modesOf(spoken).trapIntro(moveToken(answer.san, side)), answer.path)];
}

/** Before the user's first move, in a mode. */
export function introModeWords(spoken: Spoken): string[] | null {
  const { practice, session } = spoken;
  const modes = modesOf(spoken);
  const card = roundCard(session);
  const key = `intro|${practice.start}`;
  if (card?.kind === 'review') return [pickBy(modes.reviewIntro, key)];
  if (card?.kind === 'blitz') return [pickBy(modes.blitzGo, key)];
  if (card?.kind === 'trap') return [pickBy(modes.trapWatchWords, key)];
  if (card?.kind === 'games') {
    const { drill } = card;
    const habit = moveToken(drill.habit, practice.side);
    return [
      modes.gamesIntro(drill.times, drill.games, habit),
      pickBy(modes.gamesFind(drill.why), key),
    ];
  }
  const kind = ownKind(spoken);
  return kind ? [pickBy(modes.ownIntro(kind, practice.own?.name ?? ''), key)] : null;
}

/** A move refused in a mode, before it's taken back. */
export function refusedModeWords(spoken: Spoken, played: Played, why: Refusal): string[] | null {
  const modes = modesOf(spoken);
  if (roundCard(spoken.session)?.kind === 'blitz') return [];
  if (why === 'habit')
    return [pickBy(modes.habit(moveToken(played.san, spoken.practice.side)), played.path)];
  return why === 'aim' ? [pickBy(modes.aimMissed, played.path)] : null;
}

/** Why a move was refused, in a mode. */
export function whyMissedMode(spoken: Spoken, miss: Miss): Ways | null {
  const modes = modesOf(spoken);
  const move = moveToken(miss.played.san, spoken.practice.side);
  if (miss.why === 'habit') return modes.habit(move);
  if (miss.why === 'aim' || spoken.practice.own?.kind === 'trap') return modes.aimMissed;
  const kind = ownKind(spoken);
  return kind ? modes.ownOut(kind, move) : null;
}

/** The move to find, once a move is refused: a trap's theme, the drill's, the book's. */
export function findWords(spoken: Spoken, key: string): string[] {
  const { session, source } = spoken;
  const modes = modesOf(spoken);
  const card = roundCard(session);
  if (card?.kind === 'trap') {
    const theme = card.trap.themes.map(modes.trapTheme).find(Boolean);
    return theme ? [theme] : [];
  }
  if (card?.kind === 'games') return [pickBy(modes.gamesFind(card.drill.why), key)];
  const kind = ownKind(spoken);
  if (kind) return [pickBy(modes.ownFind(kind), key)];
  return [pickBy(session.language.ui.practice.findBook(source), key)];
}

/** A card's end, in a round. */
export function endModeWords(spoken: Spoken): string[] | null {
  // The card's title says it: the coach cheers, if it has something to cheer.
  return roundCard(spoken.session) ? [] : null;
}

/** What the coach cheers after the move to `path`. */
export function cheerWords(spoken: Spoken, path: string): string[] {
  const cheer = spoken.practice.cheers.get(path);
  if (!cheer) return [];
  const modes = modesOf(spoken);
  return [
    cheer.kind === 'goal' ? modes.goalMet(cheer.days) : modes.mastery(cheer.name, cheer.mastery),
  ];
}
