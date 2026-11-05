import {
  attackedSquares,
  type Board,
  type Color,
  opposite,
  type Square,
} from '#shared/chess/index.ts';
import type { Move, Win } from './line-win.ts';
import { attackerSquares, exchangeGain, isHanging, PIECE_VALUES } from './material.ts';
import type { Motif } from './motifs.ts';
import { checkers } from './rays.ts';

// The motifs that win by pressure rather than a blow, tried once the sharper
// ones (motifs.ts) find nothing: a defender lured or chased away, two loose
// targets hit at once, a target attacked more times than it's defended, or
// attacked anew and lost.

export type PressureKind =
  | 'deflection'
  | 'chasedDefender'
  | 'doubleAttack'
  | 'outnumbered'
  | 'attacked';

/** How many pieces each kind is about: a defender and its target, two targets, or one. */
export const PRESSURE_PIECES: Readonly<Record<PressureKind, 1 | 2>> = {
  deflection: 2,
  chasedDefender: 2,
  doubleAttack: 2,
  outnumbered: 1,
  attacked: 1,
};

export const isPressureKind = (kind: string): kind is PressureKind =>
  Object.hasOwn(PRESSURE_PIECES, kind);

type Detector = (win: Win, i: number) => Motif | null;

const sees = (board: Board, from: Square, square: Square): boolean =>
  attackedSquares(board, from).includes(square);

/** Whether `winner` wins something by taking on `square`, the piece there loose or outnumbered. */
const winnable = (board: Board, square: Square, winner: Color): boolean => {
  const piece = board.get(square);
  if (!piece || piece.color === winner) return false;
  return isHanging(board, square, piece) || exchangeGain(board, square, winner) > 0;
};

/** The reply taking back the winner's capture `i`, and the target's square then. */
function takenBack(win: Win, i: number): { back: Move; at: Square } | null {
  const [taking, back] = [win.moves[i], win.moves[i + 1]];
  const at = win.squares[i + 1];
  if (i !== win.capture - 2 || !taking?.ply.captured || !back || !at) return null;
  return back.to === taking.to && back.from !== at ? { back, at } : null;
}

/** The winner's capture `i` makes a defender of the target take back, which leaves it loose. */
const deflection: Detector = (win, i) => {
  const found = takenBack(win, i);
  if (!found) return null;
  const { back, at } = found;
  const guarded = sees(back.ply.before, back.from, at);
  if (!guarded || !winnable(back.ply.after, at, win.winner)) return null;
  return { kind: 'deflection', ply: i, pieces: [back.ply.piece, win.target], at: [back.from, at] };
};

/** The winner's move `i` attacks a defender of the target, which steps away and leaves it loose. */
const chasedDefender: Detector = ({ moves, winner, capture, target, squares }, i) => {
  const [move, away] = [moves[i], moves[i + 1]];
  const at = squares[i + 1];
  if (i !== capture - 2 || !move || !away || !at || away.from === at || away.ply.captured)
    return null;
  const chased = sees(move.ply.after, move.to, away.from) && sees(away.ply.before, away.from, at);
  const freed = !winnable(move.ply.before, at, winner) && winnable(away.ply.after, at, winner);
  if (!chased || !freed) return null;
  return { kind: 'chasedDefender', ply: i, pieces: [away.ply.piece, target], at: [away.from, at] };
};

const worth = (board: Board, square: Square): number => {
  const piece = board.get(square);
  if (!piece) return 0;
  return piece.role === 'king' ? 100 : PIECE_VALUES[piece.role];
};

/**
 * The winner's move `i` attacks the target and another piece at once, each
 * loose or worth more than the attacker, and the attacker safe: a fork
 * that may hit pawns.
 */
const doubleAttack: Detector = ({ moves, winner, capture, squares }, i) => {
  const [move, reply] = [moves[i], moves[i + 1]];
  const at = squares[i + 1];
  if (i !== capture - 2 || !move || !reply || reply.ply.captured || !at) return null;
  if (move.ply.piece.role === 'king') return null;
  const board = move.ply.after;
  if (winnable(board, move.to, opposite(winner))) return null;
  const mover = PIECE_VALUES[move.ply.piece.role];
  const hit = (square: Square): boolean =>
    board.get(square)?.color === opposite(winner) &&
    (worth(board, square) > mover || winnable(board, square, winner));
  const others = attackedSquares(board, move.to).filter(square => square !== at && hit(square));
  const [other] = others.toSorted((first, second) => worth(board, second) - worth(board, first));
  const [piece, targetPiece] = [other && board.get(other), board.get(at)];
  if (!other || !piece || !targetPiece || !sees(board, move.to, at) || !hit(at)) return null;
  return { kind: 'doubleAttack', ply: i, pieces: [piece, targetPiece], at: [other, at] };
};

/**
 * The target, defended, has more attackers than defenders when the winner
 * takes it, on the winner's first move: as it stands, not once moves have
 * piled up on it.
 */
const outnumbered: Detector = ({ moves, winner, capture, target }, i) => {
  const taking = moves[capture];
  const first = moves.findIndex(move => move.ply.color === winner);
  if (i !== capture || i !== first || !taking || target.role === 'king') return null;
  const board = taking.ply.before;
  const attackers = attackerSquares(board, taking.to, winner);
  const defenders = attackerSquares(board, taking.to, target.color);
  const cheaper = attackers.some(square => worth(board, square) < PIECE_VALUES[target.role]);
  const more = defenders.length > 0 && attackers.length > defenders.length;
  if (cheaper || !more || exchangeGain(board, taking.to, winner) === 0) return null;
  return { kind: 'outnumbered', ply: i, pieces: [target], at: [taking.to] };
};

/** The winner's quiet move `i` attacks the target, safe until then, and the reply can't save it. */
const attacked: Detector = ({ moves, winner, capture, target, squares }, i) => {
  const [move, reply] = [moves[i], moves[i + 1]];
  const at = squares[i + 1];
  if (i !== capture - 2 || !move || !reply || !at || move.ply.captured || reply.ply.captured)
    return null;
  if (checkers(move.ply.after, opposite(winner)).length > 0) return null;
  const now = sees(move.ply.after, move.to, at) && winnable(move.ply.after, at, winner);
  if (!now || winnable(move.ply.before, at, winner)) return null;
  return { kind: 'attacked', ply: i, pieces: [target], at: [at] };
};

/** The detectors, tried in order at each of the winner's moves. */
export const PRESSURE_DETECTORS: readonly Detector[] = [
  deflection,
  chasedDefender,
  doubleAttack,
  outnumbered,
  attacked,
];
