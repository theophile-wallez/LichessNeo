import type { Color } from '#shared/chess/types.ts';
import { shuffled } from '#shared/shuffle.ts';
import { OPENINGS } from './openings.ts';
import type { PgnTree } from './pgn-tree.ts';
import type { Entry } from './repertoire.ts';

// The timed challenge: as many positions as the user can play right in a
// minute, one move each, both sides mixed. Its positions are their own
// repertoire's, the moves they found there, and the openings the page offers,
// each with the move that makes it, named so the user knows which to play.

export const BLITZ_MS = 60_000;

export interface BlitzCard {
  readonly side: Color;
  /** The moves to the position, in SAN. */
  readonly moves: readonly string[];
  /** The moves that count. */
  readonly answers: readonly string[];
  /** The opening the move plays, as the card names it. */
  readonly name: string;
}

/** More than anyone plays in a minute. */
const MAX_CARDS = 80;

// Openings from one position stay apart: each card asks for its own move.
const cardKey = (card: Pick<BlitzCard, 'side' | 'moves' | 'name'>): string =>
  `${card.side}|${card.moves.join(' ')}|${card.name}`;

/** The challenge's positions, shuffled by `random`. */
export function blitzCards(entries: readonly Entry[], random: () => number): BlitzCard[] {
  const byKey = new Map<string, BlitzCard>();
  const add = (card: BlitzCard): void => {
    const kept = byKey.get(cardKey(card));
    const answers = [...new Set([...(kept?.answers ?? []), ...card.answers])];
    byKey.set(cardKey(card), { ...(kept ?? card), answers });
  };
  for (const opening of OPENINGS) {
    const moves = opening.moves.slice(0, -1);
    const last = opening.moves.at(-1);
    if (last) add({ side: opening.side, moves, answers: [last], name: opening.name });
  }
  for (const entry of entries)
    if (entry.answers.length > 0 && entry.name)
      add({ side: entry.side, moves: entry.moves, answers: entry.answers, name: entry.name });
  return shuffled([...byKey.values()], random).slice(0, MAX_CARDS);
}

/** A card's position and its moves as a tree, for its own book. */
export function cardTree(moves: readonly string[], answers: readonly string[]): PgnTree {
  const root: PgnTree = { comment: '', children: [] };
  let node = root;
  for (const san of moves) {
    const next = { san, comment: '', children: [] };
    node.children.push(next);
    node = next;
  }
  for (const san of answers) node.children.push({ san, comment: '', children: [] });
  return root;
}
