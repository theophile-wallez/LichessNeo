import type { Color } from '#shared/chess/index.ts';
import { playLine } from '#page/review/chess/played-line.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { placement } from '#page/review/game/draws.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { FactInput } from './fact.ts';
import { mateLine } from './line-facts.ts';
import { type Fact, oneOf, said } from './said.ts';
import { menaceOf, type Threat } from './threat.ts';
import { isNew } from './told.ts';
import { evaluationLevel } from './trajectory.ts';

// A perpetual check: a side checks and checks again, and the engine calls it
// a draw. Said of the move that starts it, of each check after it and of the
// king's steps away, of the third repetition that ends the game, and of the
// error that lets it in. The checks are often a must, the other side's mate
// in one waiting the moment they stop: that's said too.

// The checks in a row the engine's line must show, the move's own the first.
const CHECKS = 3;
// A level score, as the engine gives a repetition.
const DRAWN_CP = 30;
const REPETITIONS = 3;

const level = (record: PositionRecord): boolean =>
  'cp' in record && Math.abs(record.cp) <= DRAWN_CP;

/** Whether `side`'s moves in `ucis`, played from `fen`, are all checks, `count` of them at least. */
function checksOn(fen: string, ucis: readonly string[], side: Color, count = CHECKS): boolean {
  const own = playLine(fen, ucis).filter(ply => ply.piece.color === side);
  return own.length >= count && own.slice(0, count).every(ply => ply.check);
}

// The engine sees the repetition at once and gives no line: the other side
// was checking already, checks again, and the score is a dead draw.
function stillChecking(move: MoveVerdict): boolean {
  const [next] = playLine(move.position.fen, move.after.best ? [move.after.best] : []);
  const drawn = 'cp' in move.after && move.after.cp === 0;
  return drawn && move.previousPosition.san?.includes('+') === true && next?.check === true;
}

/** How many times the move's position has stood on the board, back to the last capture or pawn move. */
function timesSeen(move: MoveVerdict): number {
  const position = placement(move.position.fen);
  let seen = 0;
  for (let at: MoveVerdict | null = move; at; at = at.previousMove) {
    if (placement(at.position.fen) === position) seen += 1;
    // No position before a capture or a pawn move can come back.
    if (at.position.fen.split(' ')[4] === '0') break;
  }
  return seen;
}

/** `by`'s mate in one, were the other side to pass, as its move's token. */
function mateInOne(threat: Threat | null, by: Color): string | null {
  const menace = threat && menaceOf(threat, by);
  return threat && menace?.mate === 1 ? mateLine(threat.record, threat.fen, null) : null;
}

const isCheck = (move: MoveVerdict | null | undefined): boolean => move?.san.includes('+') === true;

// The checker's own check, its move before a check too, and the engine checks on.
function checksAgain({ move, me }: FactInput): boolean {
  const line = [move.uci, ...(move.after.line ?? [])];
  return (
    isCheck(move) &&
    isCheck(move.previousMove?.previousMove) &&
    checksOn(move.previousPosition.fen, line, me, 2)
  );
}

// The king steps out of a second check in a row, and the engine checks again.
function stepsOut({ move, them }: FactInput): boolean {
  const checker = move.previousMove;
  if (!isCheck(checker) || !isCheck(checker?.previousMove?.previousMove)) return false;
  const [next] = playLine(move.position.fen, move.after.best ? [move.after.best] : []);
  return next?.piece.color === them && next.check;
}

/** A good move in a perpetual: its first check, the checks after, the king's steps, the last repetition. */
export function perpetualFact(input: FactInput): Fact | null {
  const { move, facts, me, them, told, threats } = input;
  if (!level(move.after)) return null;
  const mate = mateInOne(threats.before, them);
  if (timesSeen(move) >= REPETITIONS) return said(oneOf(facts.repetition(mate), move));
  if (stepsOut(input)) return said(oneOf(facts.noEscape(them, mateInOne(threats.after, me)), move));
  if (!move.san.includes('+')) return null;
  const line = [move.uci, ...(move.after.line ?? [])];
  // The series' first check names it; the checks after say why they go on.
  const starts = checksOn(move.previousPosition.fen, line, me) && isNew(told, 'perpetual', me);
  if (starts) return said(oneOf(facts.perpetual(me), move));
  return checksAgain(input) ? said(oneOf(facts.checksOn(me, mate), move)) : null;
}

/** An error by a side that was winning, after which the other side checks for a draw. */
export function perpetualLetFact(input: FactInput): Fact | null {
  const { move, facts, them, sign, reply } = input;
  const line = move.after.line ?? [];
  if (!reply || !level(move.after) || evaluationLevel(move.before) * sign < 2) return null;
  if (!checksOn(move.position.fen, line, them) && !stillChecking(move)) return null;
  return said(oneOf(facts.letsPerpetual(them, reply), move));
}
