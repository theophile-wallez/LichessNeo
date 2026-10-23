import type { Analysis } from '#page/lichess/analysis.ts';
import { BLITZ_MS, blitzCards, cardTree } from '#page/review/practice/blitz.ts';
import { treeBook } from '#page/review/practice/book-tree.ts';
import { chapterOf } from '#page/review/practice/chapters.ts';
import { noteScore } from '#page/review/practice/progress.ts';
import { dueEntries, type Entry, storedRepertoire } from '#page/review/practice/repertoire.ts';
import { cardsOf, type Round } from '#page/review/practice/rounds.ts';
import { type Trap, trapTree } from '#page/review/practice/traps.ts';
import type { Session } from '#page/review/session.ts';
import { loadMoves } from './openings-actions.ts';
import { startPractice } from './practice.ts';
import { rainConfetti } from './practice-cheer.ts';

// Practice's rounds on the board: each card a line of its own, started as the
// last ends, at once in the timed challenge, after the coach's word in the
// daily review, at the user's word for a trap or a drill of their games.

/** The daily review's cards at most: a goal's worth, and more another time. */
const REVIEW_CARDS = 20;
/** The coach's word on a card found, before the next. */
const NEXT_MS = 1400;
/** The challenge moves on at once, a miss after a glance at it. */
const BLITZ_NEXT_MS = 250;
const BLITZ_MISS_MS = 700;

/** The due positions, no two of the same opening in a row where it can be helped. */
export function reviewCards(entries: readonly Entry[], now: number): Entry[] {
  const byOpening = new Map<string, Entry[]>();
  for (const entry of dueEntries(entries, now).slice(0, REVIEW_CARDS)) {
    const key = `${entry.side}|${chapterOf(entry.name)}`;
    byOpening.set(key, [...(byOpening.get(key) ?? []), entry]);
  }
  const queues = [...byOpening.values()];
  const cards: Entry[] = [];
  for (let i = 0; cards.length < queues.reduce((sum, queue) => sum + queue.length, 0); i++)
    for (const queue of queues) {
      const card = queue[i];
      if (card) cards.push(card);
    }
  return cards;
}

function startTrapCard(session: Session, analysis: Analysis, trap: Trap, round: Round): void {
  if (round.kind !== 'trap') return;
  // The board stops before the game's mistake: the opponent plays it.
  loadMoves(analysis, trap.moves.slice(0, -1));
  const own = { kind: 'trap' as const, name: round.opening, positions: treeBook(trapTree(trap)) };
  startPractice(session, analysis, { side: round.side, opening: round.opening, own });
}

/** Puts the round's card on the board, its line started. */
export function startCard(session: Session, analysis: Analysis): void {
  const { round } = session.view;
  if (!round || round.over) return;
  if (round.kind === 'review') {
    const entry = round.cards[round.index];
    if (!entry) return;
    loadMoves(analysis, entry.moves);
    startPractice(session, analysis, { side: entry.side, opening: entry.name, length: 1 });
  } else if (round.kind === 'blitz') {
    const card = round.cards[round.index];
    if (!card) return;
    loadMoves(analysis, card.moves);
    const positions = treeBook(cardTree(card.moves, card.answers));
    const own = { kind: 'card' as const, name: card.name, positions };
    startPractice(session, analysis, { side: card.side, opening: card.name, own, length: 1 });
  } else if (round.kind === 'trap') {
    const trap = round.cards[round.index];
    if (trap) startTrapCard(session, analysis, trap, round);
  } else {
    const drill = round.cards[round.index];
    if (!drill) return;
    loadMoves(analysis, drill.moves);
    const aims = { path: analysis.path, moves: drill.better, habit: drill.habit };
    startPractice(session, analysis, { side: drill.side, opening: drill.name, aims, length: 3 });
  }
}

/** The next card, or the round's end. */
export function nextCard(session: Session, analysis: Analysis): void {
  const { round } = session.view;
  if (!round || round.over) return;
  round.index++;
  if (round.index < round.cards.length) startCard(session, analysis);
  else finishRound(session);
  session.redraw(true);
}

function finishRound(session: Session): void {
  const { round } = session.view;
  if (!round || round.over) return;
  round.over = true;
  if (round.kind === 'blitz') round.record = noteScore('blitz', round.clean);
  if (round.kind === 'blitz' && round.record) rainConfetti();
}

/** After `ms`, the next card, unless the round has moved on meanwhile. */
function later(session: Session, analysis: Analysis, ms: number): void {
  const { round } = session.view;
  const index = round?.index;
  setTimeout(() => {
    if (session.view.round === round && round?.index === index) nextCard(session, analysis);
  }, ms);
}

/** A card's line has ended, clean or not: the review and the challenge go on by themselves. */
export function cardEnded(session: Session, analysis: Analysis, clean: boolean): void {
  const { round } = session.view;
  if (!round || round.over) return;
  round.played++;
  if (clean) round.clean++;
  if (round.kind === 'review') later(session, analysis, NEXT_MS);
  if (round.kind === 'blitz') later(session, analysis, BLITZ_NEXT_MS);
}

/** A move missed in the challenge isn't taken back: the next card comes. True when it's the challenge's. */
export function blitzMissed(session: Session, analysis: Analysis): boolean {
  const { round } = session.view;
  if (round?.kind !== 'blitz') return false;
  if (!round.over) {
    round.played++;
    later(session, analysis, BLITZ_MISS_MS);
  }
  return true;
}

/** Starts a round of `round`'s cards, its first on the board. */
export function startRound(session: Session, analysis: Analysis, round: Round): void {
  session.view.round = round;
  session.view.openings.settingsOpen = false;
  startCard(session, analysis);
}

/** The daily review: one move at each position due, the openings mixed. */
export function startReviewRound(session: Session, analysis: Analysis): void {
  const cards = reviewCards(storedRepertoire(), Date.now());
  if (cards.length > 0) startRound(session, analysis, { kind: 'review', ...cardsOf(cards) });
}

/** The timed challenge: a minute, from the first card on. */
export function startBlitz(session: Session, analysis: Analysis): void {
  const cards = blitzCards(storedRepertoire(), Math.random);
  const round: Round = {
    kind: 'blitz',
    ...cardsOf(cards),
    endsAt: Date.now() + BLITZ_MS,
    record: false,
  };
  startRound(session, analysis, round);
  setTimeout(() => {
    if (session.view.round !== round) return;
    finishRound(session);
    session.redraw(true);
  }, BLITZ_MS);
}
