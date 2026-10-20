import {
  attackedSquares,
  type Color,
  parseFen,
  parseSquare,
  type Piece,
  type Square,
} from '#shared/chess/index.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { pieceOn, PIECE_VALUES } from '#page/review/chess/material.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { lineOf, type LineFactInput, mateLine } from './line-facts.ts';
import { type Fact, oneOf, said } from './said.ts';
import { type Menace, menaceOf, stillThreatens, type Threat } from './threat.ts';

// What a move does about threats (coach/threat.ts): a good quiet one stops the
// opponent's, or makes one of its own; an error lets the opponent's through.
// Their moves can't be played on the board, which has no pass.

/** The threats around a move, each once searched. */
export interface Threats {
  /** The opponent's, before the move. */
  readonly before: Threat | null;
  /** The mover's own, after it. */
  readonly after: Threat | null;
}

export const NO_THREATS: Threats = { before: null, after: null };

// Half a pawn of score per pawn the threat wins, as for the lines.
const SCORE_PER_PAWN = 50;

const scoreFor = (record: PositionRecord, color: Color): number | null =>
  'cp' in record ? record.cp * (color === 'white' ? 1 : -1) : null;

/**
 * What `by` threatens, when it's real: a sure mate, or material the passed
 * position's score shows over `actual`'s, the position it was passed from.
 */
function realMenace(threat: Threat, actual: PositionRecord, by: Color): Menace | null {
  const menace = menaceOf(threat, by);
  if (!menace || menace.mate !== null) return menace;
  const passed = scoreFor(threat.record, by);
  const score = scoreFor(actual, by);
  const pawns = Math.min(menace.won?.net ?? 0, 5);
  return passed !== null && score !== null && passed - score >= SCORE_PER_PAWN * pawns
    ? menace
    : null;
}

// A longer mate's line runs through the other side's moves after a pass,
// which read as nonsense: it's named by its first move.
const MATE_SHOWN = 2;

/** The piece the move gives up: the reply takes it, and it's worth more than what it took. */
function givenUp(move: MoveVerdict): Piece | null {
  const to = move.uci.slice(2, 4);
  if (move.after.best?.slice(2, 4) !== to) return null;
  const piece = pieceOn(parseFen(move.position.fen).board, to);
  const taken = pieceOn(parseFen(move.previousPosition.fen).board, to);
  if (!piece || piece.role === 'king') return null;
  return PIECE_VALUES[piece.role] > (taken ? PIECE_VALUES[taken.role] : 0) ? piece : null;
}

function stopsText(input: LineFactInput, threat: Threat, menace: Menace): string | null {
  const { facts, move } = input;
  const first = lineOf(menace.plies.slice(0, 1), null);
  if (menace.mate !== null) {
    const cost = givenUp(move);
    if (menace.mate > MATE_SHOWN) return oneOf(facts.stopsLongMate(menace.mate, first, cost), move);
    const line = mateLine(threat.record, threat.fen, null);
    return line && oneOf(facts.stopsMate(line, cost), move);
  }
  // The piece that moves away from the threat, rather than its defense.
  const escapes = menace.plies.some(
    ply => ply.captured && ply.uci.slice(2, 4) === move.uci.slice(0, 2),
  );
  const piece = pieceOn(menace.plies[0]?.before ?? new Map(), move.uci.slice(0, 2));
  if (escapes && piece) return oneOf(facts.escapes(piece, first), move);
  const material = menace.won && facts.material(menace.won);
  return material ? oneOf(facts.stopsThreat(first, material), move) : null;
}

/**
 * What a good move stops: the mate or the material the opponent threatened.
 * A capture's point is its capture, but for a mate.
 */
export function parriedFact(input: LineFactInput, threat: Threat, matesOnly = false): Fact | null {
  const menace = realMenace(threat, input.move.before, input.them);
  if (!menace || (matesOnly && menace.mate === null)) return null;
  if (stillThreatens(input.move, menace, input.them)) return null;
  const text = stopsText(input, threat, menace);
  return text === null ? null : said(text);
}

/**
 * Whether the threat's first move could be played before the move, the same
 * piece taking the same one: then the threat isn't the move's doing.
 */
function wasThere(move: MoveVerdict, menace: Menace): boolean {
  const [first] = menace.plies;
  if (!first) return false;
  const before = parseFen(move.previousPosition.fen).board;
  const [from, to] = [parseSquare(first.uci), parseSquare(first.uci.slice(2, 4))];
  if (!from || !to) return false;
  const same = (square: Square, piece: Piece | null): boolean => {
    const there = before.get(square);
    return there?.role === piece?.role && there?.color === piece?.color;
  };
  return (
    same(from, first.piece) &&
    same(to, first.captured) &&
    attackedSquares(before, from).includes(to)
  );
}

// Whether the mover could mate already: then the threat isn't the move's doing.
const matedAlready = ({ before }: MoveVerdict, me: Color): boolean =>
  'mate' in before && before.mate * (me === 'white' ? 1 : -1) > 0;

function mateThreatText({ move, facts, me }: LineFactInput, first: string, mate: number): string {
  const taken = move.san.includes('x')
    ? pieceOn(parseFen(move.previousPosition.fen).board, move.uci.slice(2, 4))
    : undefined;
  return taken && taken.color !== me
    ? oneOf(facts.takesAndThreatensMate(taken, first, mate), move)
    : oneOf(facts.threatensMate(first, mate), move);
}

/**
 * What a good move threatens, were the opponent to pass: mate, or material,
 * new with it. A capture's point is its capture, but for a mate.
 */
export function threatensFact(
  input: LineFactInput,
  threat: Threat,
  matesOnly = false,
): Fact | null {
  const { move, facts, me } = input;
  const menace = realMenace(threat, move.after, me);
  const first = menace && lineOf(menace.plies.slice(0, 1), null);
  if (!menace || !first) return null;
  // A piece that could take before may still not have mated.
  if (menace.mate !== null) {
    if (matedAlready(move, me)) return null;
    const mate = menace.mate === 1 ? mateLine(threat.record, threat.fen, null) : null;
    return said(mateThreatText(input, mate ?? first, menace.mate));
  }
  if (matesOnly || wasThere(move, menace)) return null;
  const material = menace.won && facts.material(menace.won);
  return material ? said(oneOf(facts.threatens(first, material), move)) : null;
}

/** Whether an error lets through what the opponent threatened: its reply is the threat. */
export function letsThrough({ move, them }: LineFactInput, threat: Threat): boolean {
  const first = realMenace(threat, move.before, them)?.plies[0]?.uci;
  return first !== undefined && first === move.after.best;
}
