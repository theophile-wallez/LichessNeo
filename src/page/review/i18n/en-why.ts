import type { PassedTrait } from '#page/review/coach/passed-pawns.ts';
import type { Piece } from '#shared/chess/index.ts';
import {
  isLineReason,
  isPlain,
  isQuietReason,
  type LineReason,
  type PlainReason,
  type Reason,
} from '#page/review/coach/idea.ts';
import { squareToken } from '#page/review/comment/tokens.ts';
import { definite, pairOf, pieceName } from './en-grammar.ts';
import { quietWhyEn } from './en-quiet-plans.ts';
import { chaseWhyEn, pawnWhyEn } from './en-tactic-plans.ts';

const TRAIT_EN = { connected: 'a connected', protected: 'a protected', outside: 'an outside' };

const passedWhy = (made: boolean, trait: PassedTrait | null): string =>
  made ? `creating ${trait ? TRAIT_EN[trait] : 'a'} passed pawn` : 'pushing the passed pawn';
import type { Viewer } from './types.ts';

// Why a move was played, as a participle after its name: "Better was Nf6,
// developing your knight."

// The piece a pin holds is its own side's: named once whose they are, not twice.
const bare = (piece: Piece): string => definite(null, piece);

const PLAIN_REASONS: Readonly<Record<PlainReason, string>> = {
  doublesRooks: 'doubling the rooks',
  seventhRank: 'putting the rook on the seventh rank',
  rooksOnSeventh: 'doubling the rooks on the seventh rank',
  rookLift: 'lifting the rook toward the king',
  minorityAttack: 'starting the minority attack',
  philidor: 'setting up the Philidor defense',
  connectsRooks: 'connecting the rooks',
  centralKing: 'bringing the king to the center',
  center: 'taking the center',
  fightsCenter: 'fighting for the center',
  supportsCenter: 'supporting the center',
  castles: 'castling the king to safety',
  behindPasser: 'putting the rook behind the passed pawn',
  blocksPasser: 'stopping the passed pawn',
  luft: 'giving the king a square to breathe',
  space: 'gaining space',
  opposition: 'taking the opposition',
  checks: 'with check',
  discoveredCheck: 'with a discovered check',
};

type PieceReason = Extract<Reason, { readonly piece: Piece }>;

function pinWhy({ kept, behind }: Extract<PieceReason, { kind: 'pins' }>, piece: string): string {
  return kept
    ? `keeping ${piece} pinned to ${bare(behind)}`
    : `pinning ${piece} to ${bare(behind)}`;
}

function pieceWhy(reason: PieceReason, the: (piece: Piece) => string): string {
  const piece = the(reason.piece);
  if (reason.kind === 'develops') return `developing ${piece}`;
  if (reason.kind === 'outpost') return `planting ${piece} on an outpost`;
  if (reason.kind === 'chases') return chaseWhyEn(reason, piece);
  if (reason.kind === 'attacksPawn') return pawnWhyEn(reason);
  if (reason.kind === 'pins') return pinWhy(reason, piece);
  if (reason.kind === 'saves') return `getting ${piece} out of danger`;
  if (reason.kind === 'guards')
    return reason.square ? `defending ${piece} on ${reason.square}` : `defending ${piece}`;
  if (reason.kind === 'centralizes') return `centralizing ${piece}`;
  return takesWhyEn(reason, piece);
}

// The queens traded, a piece traded off, pawns exchanged on their square.
function tradeWhyEn({ piece, square }: Extract<Reason, { kind: 'trades' }>, named: string): string {
  if (piece.role === 'queen') return 'trading the queens';
  return piece.role === 'pawn' ? `exchanging on ${squareToken(square)}` : `trading off ${named}`;
}

// A capture, its piece by its square when it's one of several, or a trade.
function takesWhyEn(reason: PieceReason, piece: string): string {
  if (reason.kind === 'takesWith')
    return reason.square
      ? `taking with the ${pieceName(reason.piece)} on ${reason.square} instead`
      : `taking with ${piece} instead`;
  if (reason.kind === 'trades') return tradeWhyEn(reason, piece);
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
export function whyEn(viewer: Viewer): (reason: Reason) => string {
  const the = (piece: Piece): string => definite(viewer, piece);
  const quiet = quietWhyEn(the);
  const why = (reason: Reason): string => {
    if (isPlain(reason)) return PLAIN_REASONS[reason.kind];
    if (isQuietReason(reason)) return quiet(reason, false);
    if (reason.kind === 'both') return `${why(reason.first)} and ${why(reason.second)}`;
    if (reason.kind === 'discovery')
      return reason.target.role === 'king'
        ? 'setting up a discovered check'
        : `setting up a discovered attack on ${the(reason.target)}`;
    if (reason.kind === 'doubleThreat')
      return `threatening mate and ${the(reason.target)} at once, and only one can be saved`;
    if ('piece' in reason) return pieceWhy(reason, the);
    if (isLineReason(reason)) return lineWhy(reason, the);
    if (reason.kind === 'passedPawn') return passedWhy(reason.made, reason.trait);
    if (reason.kind === 'fork') return `forking ${pairOf(viewer, reason.first, reason.second)}`;
    if (reason.kind === 'attacksKing') return `attacking ${the(reason.king)}`;
    if (reason.kind === 'outruns') return `outrunning ${the(reason.king)}`;
    if (reason.kind === 'entersSquare')
      return `bringing ${the(reason.king)} into the pawn’s square`;
    return `winning ${reason.material}`;
  };
  return why;
}
