import type { Piece } from '#shared/chess/index.ts';
import { isPlain, type PlainReason, type Reason } from '#page/review/coach/idea.ts';
import { capitalize, definite } from './en-grammar.ts';
import type { PlanSentences, Viewer } from './types.ts';

const PLAIN_REASONS: Readonly<Record<PlainReason, string>> = {
  doublesRooks: 'doubling the rooks',
  seventhRank: 'putting the rook on the seventh rank',
  connectsRooks: 'connecting the rooks',
  centralKing: 'bringing the king to the center',
  center: 'taking the center',
  castles: 'castling the king to safety',
};

// What the better move did, after its name: "Better was Nf6, developing your knight."
function whyEn(viewer: Viewer): (reason: Reason) => string {
  const the = (piece: Piece): string => definite(viewer, piece);
  return reason => {
    if (isPlain(reason)) return PLAIN_REASONS[reason.kind];
    if (reason.kind === 'develops') return `developing ${the(reason.piece)}`;
    if (reason.kind === 'outpost') return `planting ${the(reason.piece)} on an outpost`;
    if (reason.kind === 'openFile')
      return `taking the ${reason.halfOpen ? 'half-open' : 'open'} file`;
    if (reason.kind === 'passedPawn')
      return reason.made ? 'creating a passed pawn' : 'pushing the passed pawn';
    if (reason.kind === 'chases') return `attacking ${the(reason.piece)}`;
    if (reason.kind === 'pins') return `pinning ${the(reason.piece)} to ${the(reason.behind)}`;
    if (reason.kind === 'fork') return `forking ${the(reason.first)} and ${the(reason.second)}`;
    if (reason.kind === 'takes') return `taking ${the(reason.piece)}`;
    return `winning ${reason.material}`;
  };
}

// What a rook's, a pawn's or the king's move does, whoever's it is.
const BOARD_PLANS: Omit<PlanSentences, 'develops' | 'outpost' | 'chases' | 'pins' | 'why'> = {
  openFile: halfOpen => {
    const file = `the ${halfOpen ? 'half-open' : 'open'} file`;
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
  center: [
    'The pawn takes the center.',
    'A pawn in the center, controlling key squares.',
    'A central pawn: more space, more control.',
  ],
};

// What a quiet move does for the position.
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
    chases: piece => [
      `${capitalize(the(piece))} is under attack and has to move.`,
      `That hits ${the(piece)}, gaining time.`,
      `${capitalize(the(piece))} has to move: that gains a tempo.`,
    ],
    pins: (piece, behind) => [
      `${capitalize(the(piece))} is pinned to ${the(behind)}.`,
      `A pin: ${the(piece)} can’t move without exposing ${the(behind)}.`,
      `${capitalize(the(piece))} is stuck in front of ${the(behind)}.`,
    ],
    why: whyEn(viewer),
    ...BOARD_PLANS,
  };
}
