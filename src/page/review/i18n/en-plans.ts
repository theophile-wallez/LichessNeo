import type { Piece } from '#shared/chess/index.ts';
import type { PassedTrait } from '#page/review/coach/passed-pawns.ts';
import { capitalize, definite } from './en-grammar.ts';
import { quietPlansEn } from './en-quiet-plans.ts';
import { tacticPlansEn } from './en-tactic-plans.ts';
import { whyEn } from './en-why.ts';
import type { QuietPlanSentences } from './plan-types.ts';
import type { PlanSentences, Viewer, Ways } from './types.ts';

// A passed pawn born or pushed on, or what makes it strong.
const PASSED: Record<PassedTrait | 'born' | 'pushed', Ways> = {
  born: [
    'A passed pawn is born.',
    'That creates a passed pawn, an asset for the endgame.',
    'A new passed pawn: a long-term trump.',
  ],
  pushed: [
    'The passed pawn moves on.',
    'The passed pawn marches on.',
    'Passed pawns must be pushed, and this one is on its way.',
    'The passed pawn gets closer to queening.',
  ],
  connected: [
    'Two connected passed pawns: they guard each other as they march on.',
    'Connected passed pawns, side by side: a pair that is hard to stop.',
  ],
  protected: [
    'A protected passed pawn: another pawn guards it, so the king can’t take it.',
    'The passed pawn is guarded by a pawn: a lasting trump.',
  ],
  outside: [
    'An outside passed pawn, far from the other pawns: it lures the king away.',
    'The passed pawn on the edge drags the other king away from the rest.',
  ],
};

// What a rook's, a pawn's or the king's move does, whoever's it is.
type PiecePlans =
  | 'develops'
  | 'outpost'
  | 'chases'
  | 'developsWithTempo'
  | 'traps'
  | 'attacksPawn'
  | 'pins'
  | 'saves'
  | 'guards'
  | 'centralizes'
  | 'outruns'
  | 'entersSquare'
  | 'discovery'
  | 'fileBattery'
  | 'diagonalBattery';

const BOARD_PLANS: Omit<PlanSentences, PiecePlans | keyof QuietPlanSentences | 'why'> = {
  openFile: (halfOpen, contested) => {
    const file = `the ${halfOpen ? 'half-open' : 'open'} file`;
    if (contested)
      return [
        `That contests ${file}.`,
        `A challenge for ${file}: it won’t be the other side’s alone.`,
        `${capitalize(file)} is contested now.`,
      ];
    return [
      `The rook takes ${file}, where it belongs.`,
      `The rook takes ${file}.`,
      `The rook grabs ${file}: that’s where rooks come alive.`,
      `The rook moves to ${file}, ready to strike.`,
    ];
  },
  doublesRooks: [
    'The rooks double up: twice the pressure on the file.',
    'Two rooks on one file: a powerful battery.',
    'The rooks line up on the file.',
  ],
  seventhRank: [
    'The rook reaches the seventh rank, where it does the most damage.',
    'A rook on the seventh: pawns and king come under fire.',
    'The rook invades the seventh rank.',
  ],
  rooksOnSeventh: [
    'Both rooks on the seventh: everything on that rank is under fire.',
    'Two rooks on the seventh rank: a deadly pair.',
  ],
  rookLift: [
    'The rook lifts up the third rank, ready to swing over to the king.',
    'A rook lift: the rook climbs to the third rank to join the attack.',
  ],
  minorityAttack: [
    'The minority attack: two pawns against three, to leave a weak pawn behind on the queenside.',
    'The b-pawn goes forward: once it trades, the c-pawn left behind is a target.',
  ],
  philidor: [
    'The Philidor defense: the rook holds the third rank, and checks from behind once the pawn steps up.',
    'Textbook defense: king in front of the pawn, rook on the third rank. That’s a draw.',
  ],
  connectsRooks: [
    'The rooks are connected now.',
    'The back rank is clear: the rooks defend each other.',
    'With the back rank clear, the rooks work together.',
  ],
  passedPawn: (made, trait) => PASSED[trait ?? (made ? 'born' : 'pushed')],
  centralKing: [
    'The king heads for the center, where it counts in an endgame.',
    'In the endgame the king is a fighter: it heads for the center.',
    'The king steps up: in an endgame, its place is in the center.',
  ],
  behindPasser: [
    'The rook gets behind the passed pawn, to push it on.',
    'Behind the passed pawn: the best place for a rook.',
    'The rook backs the passed pawn from behind.',
  ],
  blocksPasser: [
    'The rook stands in front of the passed pawn: it goes no further.',
    'In front of the passed pawn, the rook stops it in its tracks.',
  ],
  fightsCenter: [
    'The pawn fights for the center.',
    'A flank pawn that takes aim at the center.',
    'The pawn contests the center from the side.',
  ],
  supportsCenter: [
    'The pawn supports the center.',
    'A pawn to support the center.',
    'The central pawn is supported now.',
  ],
  luft: [
    'The king gets a square off the back rank: no more back-rank mate.',
    'A breathing hole for the king, against a back-rank mate.',
    'The king has an escape square now.',
  ],
  space: [
    'The pawn gains space.',
    'A pawn on the fifth rank cramps the other side.',
    'More space: the pawn presses forward.',
  ],
  opposition: [
    'The king takes the opposition: face to face, the other king has to give way.',
    'Opposition: the kings face each other, a square apart, and the other one must step aside.',
    'The king faces the other one: the opposition, the key to pawn endings.',
  ],
  distantOpposition: [
    'The distant opposition: an odd number of squares between the kings, and the other one will have to give way.',
    'The king takes the opposition from afar: when the kings meet, the other one gives way.',
  ],
  keySquare: [
    'The king reaches a key square: the pawn will queen, whatever the defense.',
    'A key square for the king: from there, the pawn goes through.',
  ],
  cornerDraw: [
    'The king reaches the corner: against a rook pawn, that’s a draw.',
    'Into the corner: a rook pawn can’t win against a king there.',
  ],
  bridge: [
    'Building a bridge: from the fourth rank, the rook will block the checks. The Lucena position, and it wins.',
    'The bridge of the Lucena position: the rook gets ready to shield the king from the checks.',
  ],
  vancura: [
    'The Vancura defense: the rook attacks the pawn from the side, and the draw holds.',
    'The rook hits the rook pawn from the side: the Vancura position, a draw.',
  ],
  center: [
    'The pawn takes the center.',
    'A pawn in the center, controlling key squares.',
    'A central pawn: more space, more control.',
  ],
};

export function plansEn(viewer: Viewer): PlanSentences {
  const the = (piece: Piece): string => definite(viewer, piece);
  return {
    develops: piece => [
      `Another piece out: ${the(piece)}.`,
      `${capitalize(the(piece))} comes into play.`,
      `${capitalize(the(piece))} joins the game, right on time.`,
      `Development: ${the(piece)} steps out.`,
    ],
    outpost: piece => [
      `${capitalize(the(piece))} lands on an outpost: no pawn can chase it away.`,
      `${capitalize(the(piece))} settles on a fine outpost, out of the pawns’ reach.`,
      `${capitalize(the(piece))} takes up a strong outpost.`,
    ],
    saves: piece => [
      `${capitalize(the(piece))} gets out of danger.`,
      `${capitalize(the(piece))} steps out of harm’s way.`,
      `${capitalize(the(piece))} retreats to safety.`,
    ],
    guards: (piece, square) => {
      const target = square === null ? the(piece) : `${the(piece)} on ${square}`;
      return [
        `That defends ${target}.`,
        `${capitalize(target)} is protected now.`,
        `A timely guard for ${target}.`,
      ];
    },
    centralizes: piece => [
      `${capitalize(the(piece))} heads for the center.`,
      `${capitalize(the(piece))} takes a central square.`,
      `${capitalize(the(piece))} is centralized, where it reaches the most squares.`,
    ],
    outruns: king => [
      `${capitalize(the(king))} is outside the pawn’s square: it can’t catch it anymore.`,
      `The rule of the square: ${the(king)} is too far, and the pawn runs to promote.`,
      `The pawn runs to promote: outside its square, ${the(king)} can’t stop it.`,
    ],
    entersSquare: king => [
      `${capitalize(the(king))} steps into the pawn’s square: it will catch it.`,
      `The rule of the square: ${the(king)} gets in just in time, and the pawn won’t get through.`,
      `${capitalize(the(king))} steps closer just in time: it’s in the pawn’s square now.`,
    ],
    ...tacticPlansEn(the),
    ...quietPlansEn(the),
    why: whyEn(viewer),
    ...BOARD_PLANS,
  };
}
