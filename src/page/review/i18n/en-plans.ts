import type { Piece } from '#shared/chess/index.ts';
import {
  isLineReason,
  isPlain,
  type LineReason,
  type PlainReason,
  type Reason,
} from '#page/review/coach/idea.ts';
import { squareToken } from '#page/review/comment/tokens.ts';
import { capitalize, definite, pairOf, pieceName } from './en-grammar.ts';
import { tacticPlansEn } from './en-tactic-plans.ts';
import type { PlanSentences, Viewer } from './types.ts';

// The piece a pin holds is its own side's: named once whose they are, not twice.
const bare = (piece: Piece): string => definite(null, piece);

const PLAIN_REASONS: Readonly<Record<PlainReason, string>> = {
  doublesRooks: 'doubling the rooks',
  seventhRank: 'putting the rook on the seventh rank',
  connectsRooks: 'connecting the rooks',
  centralKing: 'bringing the king to the center',
  center: 'taking the center',
  fightsCenter: 'fighting for the center',
  supportsCenter: 'supporting the center',
  castles: 'castling the king to safety',
  behindPasser: 'putting the rook behind the passed pawn',
  luft: 'giving the king a square to breathe',
  space: 'gaining space',
  opposition: 'taking the opposition',
  checks: 'with check',
  discoveredCheck: 'with a discovered check',
};

type PieceReason = Extract<Reason, { readonly piece: Piece }>;

// A piece nothing defends isn't only chased: it's there to be taken.
function chaseWhy(reason: Extract<Reason, { readonly kind: 'chases' }>, piece: string): string {
  const on = reason.square ? ` on ${reason.square}` : '';
  return reason.undefended
    ? `attacking the undefended ${pieceName(reason.piece)}${on}`
    : `gaining a tempo on ${piece}${on}`;
}

function pieceWhy(reason: PieceReason, the: (piece: Piece) => string): string {
  const piece = the(reason.piece);
  if (reason.kind === 'develops') return `developing ${piece}`;
  if (reason.kind === 'outpost') return `planting ${piece} on an outpost`;
  if (reason.kind === 'chases') return chaseWhy(reason, piece);
  if (reason.kind === 'attacksPawn')
    return `attacking the undefended ${pieceName(reason.piece)} on ${squareToken(reason.square)}`;
  if (reason.kind === 'pins') return `pinning ${piece} to ${bare(reason.behind)}`;
  if (reason.kind === 'saves') return `getting ${piece} out of danger`;
  if (reason.kind === 'guards')
    return reason.square ? `defending ${piece} on ${reason.square}` : `defending ${piece}`;
  if (reason.kind === 'centralizes') return `centralizing ${piece}`;
  if (reason.kind === 'takesWith')
    return reason.square
      ? `taking with the ${pieceName(reason.piece)} on ${reason.square} instead`
      : `taking with ${piece} instead`;
  if (reason.kind === 'takes' && reason.square)
    return `taking the ${reason.square} ${pieceName(reason.piece)}`;
  return `taking ${piece}`;
}

// An open file taken, or a battery: with the queen there already, a rook
// lines up with it rather than taking the file.
function lineWhy(reason: LineReason, the: (piece: Piece) => string): string {
  if (reason.kind === 'diagonalBattery')
    return `forming a battery with ${the(reason.partner)}, aimed at ${the(reason.target)}`;
  const file = `the ${reason.halfOpen ? 'half-open' : 'open'} file`;
  if (reason.kind === 'fileBattery')
    return `forming a battery with ${the(reason.partner)} on ${file}`;
  if (reason.kind === 'preparesBattery')
    return `preparing a battery with ${the(reason.partner)} on ${file}`;
  return reason.contested ? `contesting ${file}` : `taking ${file}`;
}

// What the better move did, after its name: "Better was Nf6, developing your knight."
// A participle says a move still to come as well.
function whyEn(viewer: Viewer): (reason: Reason) => string {
  const the = (piece: Piece): string => definite(viewer, piece);
  const why = (reason: Reason): string => {
    if (isPlain(reason)) return PLAIN_REASONS[reason.kind];
    if (reason.kind === 'both') return `${why(reason.first)} and ${why(reason.second)}`;
    if (reason.kind === 'discovery')
      return reason.target.role === 'king'
        ? 'setting up a discovered check'
        : `setting up a discovered attack on ${the(reason.target)}`;
    if (reason.kind === 'doubleThreat')
      return `threatening mate and ${the(reason.target)} at once, and only one can be saved`;
    if ('piece' in reason) return pieceWhy(reason, the);
    if (isLineReason(reason)) return lineWhy(reason, the);
    if (reason.kind === 'passedPawn')
      return reason.made ? 'creating a passed pawn' : 'pushing the passed pawn';
    if (reason.kind === 'fork') return `forking ${pairOf(viewer, reason.first, reason.second)}`;
    if (reason.kind === 'attacksKing') return `attacking ${the(reason.king)}`;
    if (reason.kind === 'outruns') return `outrunning ${the(reason.king)}`;
    if (reason.kind === 'entersSquare')
      return `bringing ${the(reason.king)} into the pawn’s square`;
    return `winning ${reason.material}`;
  };
  return why;
}

// What a rook's, a pawn's or the king's move does, whoever's it is.
type PiecePlans =
  | 'develops'
  | 'outpost'
  | 'chases'
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

const BOARD_PLANS: Omit<PlanSentences, PiecePlans | 'why'> = {
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
  connectsRooks: [
    'The rooks are connected now.',
    'The back rank is clear: the rooks defend each other.',
    'With the back rank clear, the rooks work together.',
  ],
  passedPawn: made =>
    made
      ? [
          'A passed pawn is born.',
          'That creates a passed pawn, an asset for the endgame.',
          'A new passed pawn: a long-term trump.',
        ]
      : [
          'The passed pawn moves on.',
          'The passed pawn marches on.',
          'Passed pawns must be pushed, and this one is on its way.',
          'The passed pawn gets closer to queening.',
        ],
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
  fightsCenter: [
    'The pawn fights for the center.',
    'A flank pawn that takes aim at the center.',
    'The pawn contests the center from the side.',
  ],
  supportsCenter: [
    'The pawn backs up the center.',
    'A pawn to support the center.',
    'The central pawn has a pawn behind it now.',
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
    why: whyEn(viewer),
    ...BOARD_PLANS,
  };
}
