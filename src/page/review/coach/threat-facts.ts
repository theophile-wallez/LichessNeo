import {
  attackedSquares,
  type Color,
  parseFen,
  parseSquare,
  type Piece,
  type Square,
} from '#shared/chess/index.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { pieceOn } from '#page/review/chess/material.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { lineOf, type LineFactInput, mateLine } from './line-facts.ts';
import { type Fact, said } from './said.ts';
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

function stopsText(input: LineFactInput, threat: Threat, menace: Menace): string | null {
  const { facts, move } = input;
  const first = lineOf(menace.plies.slice(0, 1), null);
  if (menace.mate !== null) {
    if (menace.mate > MATE_SHOWN) return facts.stopsLongMate(menace.mate, first);
    const line = mateLine(threat.record, threat.fen, null);
    return line && facts.stopsMate(line);
  }
  // The piece that moves away from the threat, rather than its defense.
  const escapes = menace.plies.some(
    ply => ply.captured && ply.uci.slice(2, 4) === move.uci.slice(0, 2),
  );
  const piece = pieceOn(menace.plies[0]?.before ?? new Map(), move.uci.slice(0, 2));
  if (escapes && piece) return facts.escapes(piece, first);
  const material = menace.won && facts.material(menace.won);
  return material ? facts.stopsThreat(first, material) : null;
}

/** What a good quiet move stops: the mate or the material the opponent threatened. */
export function parriedFact(input: LineFactInput, threat: Threat): Fact | null {
  const menace = realMenace(threat, input.move.before, input.them);
  if (!menace || stillThreatens(input.move, menace, input.them)) return null;
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

/** What a good quiet move threatens, were the opponent to pass: mate, or material, new with it. */
export function threatensFact({ move, facts, me }: LineFactInput, threat: Threat): Fact | null {
  const menace = realMenace(threat, move.after, me);
  const first = menace && lineOf(menace.plies.slice(0, 1), null);
  if (!menace || !first || wasThere(move, menace)) return null;
  if (menace.mate !== null) return said(facts.threatensMate(first));
  const material = menace.won && facts.material(menace.won);
  return material ? said(facts.threatens(first, material)) : null;
}

/** Whether an error lets through what the opponent threatened: its reply is the threat. */
export function letsThrough({ move, them }: LineFactInput, threat: Threat): boolean {
  const first = realMenace(threat, move.before, them)?.plies[0]?.uci;
  return first !== undefined && first === move.after.best;
}
