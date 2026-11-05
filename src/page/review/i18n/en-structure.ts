import type { Piece } from '#shared/chess/index.ts';
import type { ConceptSentences } from './concept-types.ts';
import { agree, capitalize, partyOf } from './en-grammar.ts';
import type { Viewer } from './types.ts';

// The pawns' weaknesses and the pieces' activity, in English.

type StructureConcepts = Pick<
  ConceptSentences,
  | 'isolatedPawn'
  | 'backwardPawn'
  | 'behindInDevelopment'
  | 'passiveRook'
  | 'fianchettoHoles'
  | 'hole'
  | 'fianchettoBishopGone'
>;

const PIECES = [
  'no pieces',
  'one piece',
  'two pieces',
  'three pieces',
  'four pieces',
  'five pieces',
];

export function structureEn(viewer: Viewer): StructureConcepts {
  const party = (color: Piece['color']) => partyOf(viewer, color);
  return {
    isolatedPawn: (side, square) => {
      const owner = party(side);
      return [
        `That leaves ${owner.name} an isolated pawn on ${square}: no pawn beside it to help.`,
        `The ${square} pawn is isolated now, a target for the rest of the game.`,
      ];
    },
    backwardPawn: square => [
      `That leaves the ${square} pawn behind: it can’t come up to its neighbors.`,
      `The ${square} pawn is backward now, and its square ahead belongs to the other side.`,
    ],
    behindInDevelopment: (side, pieces) => {
      const owner = party(side);
      const count = PIECES[pieces] ?? `${pieces} pieces`;
      return [
        `${capitalize(owner.name)} ${agree(owner, 'is', 'are')} ${count} behind in development: bring them out first.`,
        `Development first: ${owner.name} ${agree(owner, 'trails', 'trail')} by ${count}.`,
      ];
    },
    fianchettoHoles: (pawn, [left, right]) => [
      `Without a bishop to fianchetto, ${pawn} leaves holes on ${left} and ${right} next to the king.`,
      `Holes on ${left} and ${right}: no bishop is left to cover them.`,
    ],
    fianchettoBishopGone: (side, [left, right]) => [
      `${capitalize(party(side).possessive)} fianchetto bishop is gone: ${left} and ${right} turn into holes around the king.`,
      `Without its fianchetto bishop, the king has holes on ${left} and ${right}.`,
    ],
    hole: square => [
      `That leaves a hole on ${square}: a knight would sit there, and no pawn could chase it.`,
      `${square} becomes a hole: no pawn can ever guard it again.`,
    ],
    passiveRook: square => [
      `The rook goes passive: it only guards the pawn on ${square} now.`,
      `A passive rook, tied to the ${square} pawn: rooks want to attack.`,
    ],
  };
}
