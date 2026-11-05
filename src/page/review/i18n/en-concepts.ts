import type { Piece } from '#shared/chess/index.ts';
import type { ConceptSentences } from './concept-types.ts';

import { agree, capitalize, definite, partyOf } from './en-grammar.ts';
import { attackEn } from './en-attack.ts';
import { sacrificesEn } from './en-sacrifices.ts';
import { habitsEn } from './en-habits.ts';
import { structureEn } from './en-structure.ts';
import type { Viewer } from './types.ts';

type KingConcepts = Pick<
  ConceptSentences,
  'losesCastling' | 'blocksCheck' | 'loosensKing' | 'knightOnRim'
>;

// The chess ideas behind a move, in English.

// The king's: castling lost, a check blocked, its cover pushed; a knight on the rim.
function kingConceptsEn(viewer: Viewer): KingConcepts {
  const party = (color: Piece['color']) => partyOf(viewer, color);
  const The = (piece: Piece): string => capitalize(definite(viewer, piece));
  return {
    losesCastling: (side, line) => {
      const loser = party(side);
      const king = definite(viewer, { role: 'king', color: side });
      return [
        `${capitalize(king)} is dragged out: after ${line}, ${loser.name} can’t castle anymore.`,
        `${capitalize(loser.name)} ${agree(loser, 'loses', 'lose')} the right to castle: ${line}.`,
        `No more castling for ${loser.name}: ${line}.`,
      ];
    },
    blocksCheck: piece => [
      `${The(piece)} steps in to block the check.`,
      `${The(piece)} blocks the check.`,
      `${The(piece)} stands in the way of the check.`,
    ],
    loosensKing: [
      'That loosens the pawns in front of the king.',
      'The king’s pawn cover gets weaker.',
    ],
    knightOnRim: square => [
      `A knight on the rim is dim: on ${square} it has little to do.`,
      `On the edge, on ${square}, the knight controls few squares.`,
    ],
  };
}

export function conceptsEn(viewer: Viewer): ConceptSentences {
  const party = (color: Piece['color']) => partyOf(viewer, color);
  return {
    ...kingConceptsEn(viewer),
    ...structureEn(viewer),
    ...habitsEn(viewer),
    ...attackEn(viewer),
    ...sacrificesEn(viewer),
    winsBishopPair: side => {
      const owner = party(side);
      return [
        `${capitalize(owner.name)} ${agree(owner, 'gets', 'get')} the bishop pair.`,
        `Two bishops against one: the bishop pair for ${owner.name}.`,
      ];
    },
    givesBishopPair: side => {
      const owner = party(side);
      return [
        `That hands ${owner.name} the bishop pair.`,
        `${capitalize(owner.name)} ${agree(owner, 'keeps', 'keep')} both bishops: the bishop pair.`,
      ];
    },
    badBishopOff: [
      'Off goes a bad bishop, hemmed in by its own pawns.',
      'A bad bishop traded off: its own pawns were in its way.',
    ],
    makesBadBishop: [
      'That hems in the bishop: its own pawns now stand on its color.',
      'The pawns lock in their own bishop.',
    ],
    oppositeBishops: ahead =>
      ahead
        ? [
            'Bishops of opposite colors now: winning gets harder.',
            'Careful: with bishops of opposite colors, an extra pawn may not be enough.',
          ]
        : [
            'Bishops of opposite colors: a draw gets closer.',
            'Opposite-colored bishops: an ending that is often drawn.',
          ],
    doubledPawns: (side, reply, file) => {
      const owner = party(side);
      return [
        `After ${reply}, ${owner.possessive} pawns are doubled on the ${file}-file.`,
        `${reply} leaves ${owner.name} with doubled ${file}-pawns.`,
      ];
    },
  };
}
