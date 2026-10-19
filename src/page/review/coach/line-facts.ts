import type { Color } from '#shared/chess/index.ts';
import { playLine, type Ply } from '#page/review/chess/played-line.ts';
import { movesToken } from '#page/review/comment/tokens.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import type { FactSentences } from '#page/review/i18n/types.ts';
import { SURE_MATE } from '#page/review/judge/mate.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { afterLastMove, withMotif } from './motif-fact.ts';
import { type Fact, oneOf } from './said.ts';
import {
  finalNet,
  gives,
  materialBalance,
  securedSwing,
  type Swing,
  worthSaying,
} from './swing.ts';

// Facts read off the engine's lines, once the trades along them are over:
// what an error lets the opponent win, what the best move would have won,
// what a good move wins, and a mate move by move. Caches written before
// records kept their lines have none of them.

export interface LineFactInput {
  readonly move: MoveVerdict;
  readonly facts: FactSentences;
  readonly me: Color;
  readonly them: Color;
}

// The engine's score must show half a pawn per pawn a line wins, up to a
// rook's worth: short of that, something in the line, or past it, gives it back.
const SCORE_PER_PAWN = 50;
const shown = (pawns: number): number => SCORE_PER_PAWN * Math.min(pawns, 5);

/** The record's score from `color`'s side, in centipawns; null for a mate. */
const scoreFor = (record: PositionRecord, color: Color): number | null =>
  'cp' in record ? record.cp * (color === 'white' ? 1 : -1) : null;

/** Whether the score lost to the move shows what the best line kept over the played one. */
function scoreDrops({ before, after, color }: MoveVerdict, pawns: number): boolean {
  const kept = scoreFor(before, color);
  const left = scoreFor(after, color);
  return kept !== null && left !== null && kept - left >= shown(pawns);
}

/** A line as tokens, playable from before the move ('b') or after it ('a'); null for one that can't be played. */
export const lineOf = (plies: readonly Ply[], base: 'a' | 'b' | null): string =>
  movesToken(plies, base ? { base, ucis: plies.map(ply => ply.uci) } : undefined);

/** How many of `color`'s moves `plies` hold. */
const movesOf = (plies: readonly Ply[], color: Color): number =>
  plies.filter(ply => ply.color === color).length;

interface Lines {
  /** The move, then the engine's line after it. */
  readonly played: readonly Ply[];
  readonly best: readonly Ply[];
}

// After a capture the position is mid-trade, and a line from it would count a
// recapture as a win: an error there keeps to the board's facts.
function errorLines(move: MoveVerdict): Lines | null {
  const { before, after, previousPosition, uci } = move;
  if (!before.line || !after.line || previousPosition.san?.includes('x')) return null;
  const fen = previousPosition.fen;
  return { played: playLine(fen, [uci, ...after.line]), best: playLine(fen, before.line) };
}

// How far a line may go to win what the coach says it wins: the punishment of
// an error within three of the opponent's moves, the best move's gain within
// three of the mover's, and a good move's within its next one, else the gain
// is the line's, not the move's.
const PUNISHED_WITHIN = 6;
const BEST_WINS_WITHIN = 5;
const MOVE_WINS_WITHIN = 3;

/**
 * After an error, the line that wins the opponent material the best move kept;
 * `threatened` when it's what the opponent threatened before the move.
 */
export function lossFact({ move, facts, them }: LineFactInput, threatened = false): Fact | null {
  const lines = errorLines(move);
  const won = lines && securedSwing(lines.played, them);
  if (!lines || !won || !worthSaying(won) || won.plies > PUNISHED_WITHIN) return null;
  const gap = won.net - finalNet(lines.best, them);
  if (gap < 1 || !scoreDrops(move, gap) || gives(lines.played, move.color, [1, won.plies]))
    return null;
  const material = facts.material(won);
  const replies = lines.played.slice(1, won.plies);
  if (material === null || replies.length === 0) return null;
  const gain = { material, line: lineOf(replies, 'a'), moves: movesOf(replies, them) };
  const text = oneOf(facts.losesMaterial(them, gain, threatened), move);
  const motifLine = {
    plies: lines.played,
    offset: 1,
    winner: them,
    upTo: won.plies,
    base: 'a' as const,
  };
  return withMotif(text, motifLine, facts);
}

/** After an error, the material the best line would have won. */
export function bestGainFact({ move, facts, me, them }: LineFactInput): Fact | null {
  const lines = errorLines(move);
  const won = lines && securedSwing(lines.best, me);
  if (!lines || !won || !worthSaying(won) || won.plies > BEST_WINS_WITHIN) return null;
  const gap = won.net - finalNet(lines.played, me);
  if (gap < 1 || !scoreDrops(move, gap) || gives(lines.best, them, [0, won.plies])) return null;
  const material = facts.material(won);
  if (material === null) return null;
  const best = lines.best.slice(0, won.plies);
  const gain = { material, line: lineOf(best, 'b'), moves: movesOf(best, me) };
  const text = oneOf(facts.wouldHaveWon(me, gain), move);
  const around = afterLastMove(move, move.before.line ?? []);
  const upTo = won.plies + around.offset;
  return withMotif(text, { ...around, winner: me, upTo, base: 'b' }, facts);
}

/**
 * The move's line, from before the opponent's last move when the move takes
 * back what it took, so that the recapture counts as no gain.
 */
function ownLine(move: MoveVerdict): { plies: Ply[]; from: number } | null {
  const { after, previousMove, previousPosition, uci } = move;
  if (!after.line) return null;
  const takesBack =
    previousPosition.san?.includes('x') && previousPosition.uci?.slice(2, 4) === uci.slice(2, 4);
  if (previousMove && takesBack) {
    const fen = previousMove.previousPosition.fen;
    return { plies: playLine(fen, [previousMove.uci, uci, ...after.line]), from: 1 };
  }
  return { plies: playLine(previousPosition.fen, [uci, ...after.line]), from: 0 };
}

// The engine's score after the move must show the material the line wins on
// top of what's on the board.
function scoreShowsGain(move: MoveVerdict, start: Ply | undefined, swing: Swing): boolean {
  const score = scoreFor(move.after, move.color);
  if (score === null || !start) return false;
  return score - 100 * materialBalance(start.before, move.color) >= shown(swing.net);
}

/** What a good move wins along its line, past the reply to the move itself. */
export function gainFact({ move, facts, me, them }: LineFactInput): Fact | null {
  const line = ownLine(move);
  if (!line) return null;
  const { plies, from } = line;
  const won = securedSwing(plies, me);
  const within =
    won && worthSaying(won) && won.plies >= from + 2 && won.plies <= from + MOVE_WINS_WITHIN;
  if (
    !won ||
    !within ||
    !scoreShowsGain(move, plies[0], won) ||
    gives(plies, them, [from, won.plies])
  )
    return null;
  const material = facts.material(won);
  if (material === null) return null;
  const own = plies.slice(from, won.plies);
  const gain = { material, line: lineOf(own, 'b'), moves: movesOf(own, me) };
  const text = oneOf(facts.winsAlong(gain), move);
  const around = afterLastMove(move, [move.uci, ...(move.after.line ?? [])]);
  const upTo = won.plies - from + around.offset;
  return withMotif(text, { ...around, winner: me, upTo, base: 'b' }, facts);
}

/**
 * The mate a record's line plays out, written from `fen`, when it's short
 * enough to be sure of and the line reaches it.
 */
export function mateLine(
  record: PositionRecord,
  fen: string,
  base: 'a' | 'b' | null,
): string | null {
  if (!('mate' in record) || !record.line) return null;
  const length = 2 * Math.abs(record.mate) - 1;
  const plies = playLine(fen, record.line.slice(0, length));
  const last = plies.at(-1);
  if (Math.abs(record.mate) > SURE_MATE || plies.length < length || !last) return null;
  const mated = { ...last, san: last.san.replace(/\+?$/, '#') };
  return lineOf([...plies.slice(0, -1), mated], base);
}
