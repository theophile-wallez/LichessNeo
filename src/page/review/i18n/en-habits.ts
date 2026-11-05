import type { ConceptSentences } from './concept-types.ts';
import { capitalize, definite } from './en-grammar.ts';
import type { Viewer } from './types.ts';

// The bad habits, in English: the queen out early or grabbing a pawn, a piece
// moved twice, the king walked out, a trade when behind in material.

type HabitConcepts = Pick<
  ConceptSentences,
  'earlyQueen' | 'queenTooEarly' | 'kingWalk' | 'tradesWhenBehind' | 'pawnGrab' | 'pieceTwice'
>;

export function habitsEn(viewer: Viewer): HabitConcepts {
  return {
    earlyQueen: reply => [
      `Out this early, the queen gets chased: ${reply} comes with tempo.`,
      `The queen came out too soon: ${reply} hits it, and the other side develops for free.`,
    ],
    queenTooEarly: [
      'The queen is out too early: it will be a target while the other pieces stay home.',
      'Queen first, pieces later? It’s the other way round: knights and bishops come out first.',
    ],
    tradesWhenBehind: [
      'Behind in material, trading pieces only helps the other side.',
      'A trade when behind: with every piece off, the extra material counts more.',
    ],
    kingWalk: castling =>
      castling
        ? [
            'The king moves and gives up castling: it’s stuck in the middle now.',
            'No more castling: the king will have a hard time finding a safe spot.',
          ]
        : [
            'The king steps out with the queens still on: it can turn into a target.',
            'A king walk in the middlegame: the king belongs behind its pawns for now.',
          ],
    pawnGrab: square => [
      `The queen goes pawn hunting on ${square}: it costs time, and she ends up far from home.`,
      `A pawn grab on ${square}: the queen strays from the fight, and the other side develops with tempo.`,
    ],
    pieceTwice: piece => [
      `${capitalize(definite(viewer, piece))} moves a second time while the other pieces stay home: that’s time lost.`,
      'The same piece twice this early: the others should come out first.',
    ],
  };
}
