import type { Piece } from '#shared/chess/index.ts';
import type { MatePattern } from '#page/review/coach/mate-pattern.ts';
import type { ConceptSentences } from './concept-types.ts';
import { agree, capitalize, partyOf } from './en-grammar.ts';
import type { Viewer } from './types.ts';

const MATES_EN: Readonly<Record<MatePattern, string>> = {
  backRank: 'A back-rank mate: the king’s own pawns wall it in.',
  smothered: 'A smothered mate: the king is buried under its own pieces.',
  arabian: 'The Arabian mate: the rook beside the cornered king, the knight holding it.',
  epaulette: 'An epaulette mate: the king’s own pieces on both sides block its way out.',
};

// The attack and its last resorts, in English: a perpetual check, stalemate, a
// named mate, a pawn ending.

type AttackConcepts = PerpetualConcepts &
  Pick<ConceptSentences, 'stalemate' | 'matePattern' | 'wonPawnEnding' | 'lostPawnEnding'>;

type PerpetualConcepts = Pick<
  ConceptSentences,
  'perpetual' | 'checksOn' | 'noEscape' | 'repetition' | 'letsPerpetual'
>;

// A perpetual check: begun, kept up, or let in, and the draw by repetition it ends in.
function perpetualEn(viewer: Viewer): PerpetualConcepts {
  const party = (color: Piece['color']) => partyOf(viewer, color);
  return {
    perpetual: () => [
      'Perpetual check: the king can’t get away from the checks, and it’s a draw.',
      'Check after check: that’s a perpetual, and a draw.',
    ],
    checksOn: (side, mate) => {
      const checker = party(side);
      if (mate === null)
        return ['Check again: the perpetual goes on.', 'Still checking, and the draw holds.'];
      return [
        `${capitalize(checker.name)} ${agree(checker, 'has', 'have')} to keep checking: the moment the checks stop, ${mate} is mate.`,
        `Check again, and no choice about it: otherwise ${mate} is mate.`,
        `Another check: anything else, and ${mate} is mate.`,
      ];
    },
    noEscape: (side, mate) => {
      const checker = party(side);
      if (mate === null)
        return [
          'No way out of the checks: the game is heading for a draw by repetition.',
          'The king can’t escape the checks: a draw by repetition is coming.',
        ];
      return [
        `${capitalize(checker.name)} can’t stop checking now, or ${mate} is mate: the game is heading for a draw by repetition.`,
        `The checks go on, and they must: ${mate} would be mate. A draw by repetition is coming.`,
        `${mate} would be mate, so the checks can’t stop: a draw by repetition is coming.`,
      ];
    },
    repetition: mate =>
      mate === null
        ? [
            'The same position a third time: a draw by repetition.',
            'Threefold repetition: the game is drawn.',
          ]
        : [
            `The same position a third time: a draw by repetition, and ${mate} never comes.`,
            `Threefold repetition: the game is drawn, and ${mate} never gets played.`,
          ],
    letsPerpetual: (side, reply) => {
      const { name } = party(side);
      return [
        `That lets ${name} off the hook: ${reply} starts a perpetual check.`,
        `${reply}, and the checks never stop: a perpetual for ${name}.`,
        `${capitalize(name)} can draw now, checking on and on from ${reply}.`,
      ];
    },
  };
}

export function attackEn(viewer: Viewer): AttackConcepts {
  return {
    wonPawnEnding: [
      'Into a won pawn ending: trading everything off is the simplest way.',
      'The pieces come off, and the pawn ending is won.',
    ],
    lostPawnEnding: lost =>
      lost
        ? ['That trades into a lost pawn ending.', 'The pawn ending this trade leads to is lost.']
        : [
            'The pawn ending this trade leads to isn’t won anymore.',
            'Into a pawn ending, but not a won one: the win slips away.',
          ],
    stalemate: thrown =>
      thrown
        ? [
            'Stalemate! The other side has no move left, and a won game ends in a draw.',
            'Careful: no legal move for the other side means stalemate, and the win is gone.',
          ]
        : [
            'Stalemate: the other side has no move left, and the game is drawn. What a save!',
            'No legal move for the other side: stalemate, and a draw from a lost position.',
          ],
    matePattern: pattern => [MATES_EN[pattern]],
    ...perpetualEn(viewer),
  };
}
