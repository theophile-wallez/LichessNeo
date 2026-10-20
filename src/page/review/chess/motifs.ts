import {
  attackedSquares,
  type Board,
  type Color,
  opposite,
  type Piece,
  PIECE_VALUES,
  type Square,
} from '#shared/chess/index.ts';
import { forkedFrom } from './fork.ts';
import { boardAfter } from './line.ts';
import { type Move, retakes, type Win, winOf } from './line-win.ts';
import type { Ply } from './played-line.ts';
import {
  attackersOn,
  between,
  checkers,
  isDefended,
  isInBadSpot,
  pinnedTaker,
  type PinnedTaker,
  pinOf,
} from './rays.ts';

// The tactic that wins the material along a line, for the coach to name:
// what the winner's moves do to the piece the line ends up taking. Each rule
// follows the one Lichess tags its puzzles by (lichess-puzzler's cook.py),
// tied to that piece.

export type MotifKind =
  | 'fork'
  | 'pin'
  | 'pinnedDefender'
  | 'skewer'
  | 'discoveredAttack'
  | 'discoveredCheck'
  | 'doubleCheck'
  | 'capturingDefender'
  | 'trappedPiece'
  | 'hangingPiece';

export interface Motif {
  readonly kind: MotifKind;
  /** The index in the line of the winner's move that makes it. */
  readonly ply: number;
  /**
   * What it hits: the forked pieces, the most valuable first; the pinned or
   * skewered piece and the one behind it; the king, then the piece won; a
   * pinned defender, its pinner and the piece behind it.
   */
  readonly pieces: readonly Piece[];
  /** A pinned defender's pin, which the sentence names the squares of. */
  readonly pin?: PinnedTaker;
}

type Detector = (win: Win, i: number) => Motif | null;

const KING = (color: Color): Piece => ({ role: 'king', color });
// As a target the king outweighs everything.
const value = (piece: Piece): number => (piece.role === 'king' ? 100 : PIECE_VALUES[piece.role]);

/** The winner's move `i` forks the target with something else. */
const fork: Detector = ({ moves, capture, target, squares }, i) => {
  const move = moves[i];
  const at = squares[i + 1];
  if (!move || !at || i >= capture || target.role === 'pawn') return null;
  const forked = forkedFrom(move.ply.after, move.to);
  const hits = forked.length > 0 && attackedSquares(move.ply.after, move.to).includes(at);
  return hits ? { kind: 'fork', ply: i, pieces: forked } : null;
};

const doubleCheck: Detector = ({ moves, winner, capture, target }, i) => {
  const move = moves[i];
  if (!move || i > capture || checkers(move.ply.after, opposite(winner)).length < 2) return null;
  return { kind: 'doubleCheck', ply: i, pieces: [KING(opposite(winner)), target] };
};

/** The winner's move `i`, the capture included, uncovers a check. */
const discoveredCheck: Detector = ({ moves, winner, capture, target }, i) => {
  const move = moves[i];
  if (!move || i > capture) return null;
  const uncovered = checkers(move.ply.after, opposite(winner)).some(square => square !== move.to);
  if (!uncovered) return null;
  return { kind: 'discoveredCheck', ply: i, pieces: [KING(opposite(winner)), target] };
};

/** The winner's move `i` opens the line of a slider that takes the target next. */
const discoveredAttack: Detector = ({ moves, capture, target }, i) => {
  const [move, reply, taking] = [moves[i], moves[i + 1], moves[capture]];
  if (i !== capture - 2 || !move || !reply || !taking || move.ply.san.startsWith('O-O'))
    return null;
  const opened = between(taking.from, taking.to).includes(move.from);
  const apart = taking.to !== move.to && taking.from !== move.to && reply.to !== taking.to;
  return opened && apart ? { kind: 'discoveredAttack', ply: i, pieces: [target] } : null;
};

/** The piece in front steps off the line, and the one behind it is taken. */
const skewer: Detector = ({ moves, capture, target }, i) => {
  const [fled, taking] = [moves[capture - 1], moves[capture]];
  if (i !== capture - 2 || !fled || !taking) return null;
  const slides = ['bishop', 'rook', 'queen'].includes(taking.ply.piece.role);
  const inFront = between(taking.from, taking.to).includes(fled.from) && fled.to !== taking.to;
  const found =
    slides &&
    inFront &&
    value(fled.ply.piece) > value(target) &&
    isInBadSpot(taking.ply.before, taking.to);
  return found ? { kind: 'skewer', ply: i, pieces: [fled.ply.piece, target] } : null;
};

/**
 * Pinned to its king after the winner's move `i`, by a piece worth less, or
 * left undefended: it can't step away from what attacks it.
 */
const pinnedTarget: Detector = ({ moves, capture, target, squares }, i) => {
  const board = moves[i]?.ply.after;
  const at = squares[i + 1];
  const found = board && at && i < capture ? pinOf(board, at) : null;
  const pinner = found && board?.get(found.pinner);
  const behind = found && board?.get(found.behind);
  if (!board || !at || !pinner || !behind) return null;
  const won = value(pinner) < value(target) || !isDefended(board, at, target.color);
  return won ? { kind: 'pin', ply: i, pieces: [target, behind] } : null;
};

/**
 * The winner's move `i`, the capture included, puts a piece where only a
 * piece pinned to its king could take it.
 */
const pinnedAttacker: Detector = ({ moves, winner, capture }, i) => {
  const move = moves[i];
  const moved = move?.ply.after.get(move.to);
  if (!move || !moved || i > capture) return null;
  const board = move.ply.after;
  const loser = opposite(winner);
  for (const square of attackersOn(board, move.to, loser)) {
    const pinned = board.get(square);
    const found = pinOf(board, square);
    if (!pinned || !found) continue;
    const onLine =
      move.to === found.pinner || between(found.pinner, found.behind).includes(move.to);
    const gains = value(moved) > value(pinned) || !isDefended(board, move.to, winner);
    if (!onLine && gains) return { kind: 'pin', ply: i, pieces: [pinned, KING(loser)] };
  }
  return null;
};

/**
 * The winner's capture `i` takes a piece whose only defender is pinned to one
 * worth more: taking back would give up what stood behind it.
 */
const pinnedDefender: Detector = ({ moves, winner, capture }, i) => {
  const move = moves[i];
  const board = move?.ply.after;
  const pin = move && board && i === capture ? pinnedTaker(board, move.to, opposite(winner)) : null;
  if (!move || !board || !pin) return null;
  const [moved, pinned, pinner, behind] = [move.to, pin.taker, pin.pinner, pin.behind].map(at =>
    board.get(at),
  );
  if (!moved || !pinned || !pinner || !behind) return null;
  const pays = value(moved) > value(pinned) || !isDefended(board, move.to, winner);
  return pays ? { kind: 'pinnedDefender', ply: i, pieces: [pinned, pinner, behind], pin } : null;
};

/** No check around the winner's capture `i`, then another piece takes the target, undefended. */
function quietlyLeftBare({ moves, winner, capture, target }: Win, i: number): boolean {
  const [taking, reply, last] = [moves[i], moves[i + 1], moves[capture]];
  if (!taking || !reply || !last || last.ply.piece.role === 'king') return false;
  return (
    value(target) <= value(last.ply.piece) &&
    !isDefended(last.ply.before, last.to, target.color) &&
    reply.to !== last.to &&
    last.from !== taking.to &&
    checkers(taking.ply.before, winner).length === 0 &&
    checkers(taking.ply.after, opposite(winner)).length === 0
  );
}

/** The winner takes a defender of the target, then the target. */
const capturingDefender: Detector = (win, i) => {
  const taking = win.moves[i];
  const defender = taking?.ply.captured;
  const at = win.squares[i];
  if (i !== win.capture - 2 || !taking || !defender || !at) return null;
  const defended = attackersOn(taking.ply.before, at, opposite(win.winner)).includes(taking.to);
  if (!defended || !quietlyLeftBare(win, i)) return null;
  return { kind: 'capturingDefender', ply: i, pieces: [defender, win.target] };
};

/** Whether the piece on `at` has a square to go to, or a piece to take, that saves it. */
function canEscape(board: Board, at: Square, piece: Piece): boolean {
  return attackedSquares(board, at).some(square => {
    const taken = board.get(square);
    if (taken?.color === piece.color) return false;
    if (taken && value(taken) >= value(piece)) return true;
    return !isInBadSpot(boardAfter(board, `${at}${square}`), square);
  });
}

/** Attacked before the reply to the winner's move `i`, with nowhere to go. */
const trappedPiece: Detector = ({ moves, capture, target, squares }, i) => {
  const board = moves[capture - 1]?.ply.before;
  const at = squares[capture - 1];
  const role = target.role;
  if (i !== capture - 2 || !board || !at || role === 'pawn' || role === 'king') return null;
  if (checkers(board, target.color).length > 0 || pinOf(board, at)) return null;
  if (!isInBadSpot(board, at) || canEscape(board, at, target)) return null;
  return { kind: 'trappedPiece', ply: i, pieces: [target] };
};

/** What `color` takes along plies `from` to `to`, less what it gives. */
function netTaken(moves: readonly Move[], color: Color, [from, to]: [number, number]): number {
  let net = 0;
  for (const { ply } of moves.slice(from, to))
    if (ply.captured) net += (ply.color === color ? 1 : -1) * PIECE_VALUES[ply.captured.role];
  return net;
}

/** Taken undefended on the winner's first move, and kept over the next two plies. */
function hangingPiece({ moves, winner, capture, target }: Win): Motif | null {
  const [before, taking] = [moves[capture - 1], moves[capture]];
  const first = moves.findIndex(move => move.ply.color === winner);
  // Without the move before, a trade's end can't be told from a piece left hanging.
  if (!before || !taking || capture !== first || target.role === 'pawn') return null;
  if (retakes(before, taking) || isDefended(taking.ply.before, taking.to, target.color))
    return null;
  if (netTaken(moves, winner, [capture + 1, capture + 3]) < 0) return null;
  return { kind: 'hangingPiece', ply: capture, pieces: [target] };
}

const DETECTORS: readonly Detector[] = [
  doubleCheck,
  discoveredCheck,
  fork,
  skewer,
  discoveredAttack,
  capturingDefender,
  pinnedTarget,
  pinnedAttacker,
  pinnedDefender,
  trappedPiece,
];

/**
 * The motif by which `winner` wins material in the first `upTo` of `plies`,
 * at its earliest move that makes it; null when no rule is sure. The line may
 * open with the other side's move that led there: only then can a piece be
 * called hanging.
 */
export function lineMotif(plies: readonly Ply[], winner: Color, upTo: number): Motif | null {
  const win = winOf(plies, winner, upTo);
  if (!win) return null;
  for (let i = 0; i <= win.capture; i++) {
    if (plies[i]?.color !== winner) continue;
    for (const detect of DETECTORS) {
      const motif = detect(win, i);
      if (motif) return motif;
    }
  }
  return hangingPiece(win);
}
