import { agree, capitalize, indefinite, partyOf, type Party } from './en-grammar.ts';
import type { FactSentences, Viewer } from './types.ts';

/** "You", "The opponent", "White": a side at the start of a sentence. */
const subject = (party: Party): string => capitalize(party.name);

// The routine moves, in English: a promotion, castling, a check.

type RoutineSentences = Pick<
  FactSentences,
  'castles' | 'castlesOpposite' | 'promotes' | 'checkForces'
>;

export function routinesEn(viewer: Viewer): RoutineSentences {
  return {
    promotes: (piece, check) => {
      if (piece.role !== 'queen' && check)
        return [
          `Underpromotion: ${indefinite(piece)}, and with check! A queen wouldn’t have done better.`,
        ];
      if (piece.role !== 'queen')
        return [`Underpromotion: ${indefinite(piece)} rather than a queen, and rightly so.`];
      return [
        `The pawn promotes to ${indefinite(piece)}.`,
        `The pawn reaches the last rank and becomes ${indefinite(piece)}.`,
        `Promotion: the pawn turns into ${indefinite(piece)}.`,
      ];
    },
    castlesOpposite: [
      'Castled on the other wing: now it’s a race, each side storming the other king.',
      'Kings on opposite wings: the pawn storms are coming, and speed is everything.',
    ],
    castles: [
      'The king is safe, and the rook joins the game.',
      'Castled: the king tucked away, the rook ready for action.',
      'The king goes to safety, and the rook comes into play.',
      'Castling: a safe king, and a rook ready to join in.',
    ],
    checkForces: color => {
      const checked = partyOf(viewer, color);
      return [
        `The check forces ${checked.name} to respond.`,
        `Check! ${subject(checked)} ${agree(checked, 'has', 'have')} to respond.`,
        `Check: ${checked.name} must answer first.`,
      ];
    },
  };
}
