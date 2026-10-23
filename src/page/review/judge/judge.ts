import { fenTurn } from '#shared/chess/index.ts';
import { isSacrifice } from '#page/review/chess/material.ts';
import { normalizeUci, uciToSan } from '#page/review/chess/notation.ts';
import { isError, type MoveClass, RANK } from '#page/review/classes/classes.ts';
import { forColor, moveAccuracy } from '#page/review/evaluation/score.ts';
import { letInMateClass, mateVerdict, SURE_MATE } from './mate.ts';
import type { JudgeInput, MoveVerdict } from './types.ts';

interface Standing {
  readonly before: number;
  readonly after: number;
  readonly loss: number;
  /** The engine's second line, from the mover's view. */
  readonly second: number | null;
}

function lossClass(loss: number): MoveClass {
  if (loss < 2) return 'excellent';
  if (loss < 5) return 'good';
  if (loss < 10) return 'inaccuracy';
  return loss < 20 ? 'mistake' : 'blunder';
}

function topClass(input: JudgeInput, { before, after, loss, second }: Standing): MoveClass {
  const { previousPosition, position } = input;
  if (
    after >= 50 &&
    before < 95 &&
    loss < 2 &&
    isSacrifice(previousPosition.fen, position.fen, position.uci)
  )
    return 'brilliant';
  // The only good move: the second best was far worse. Taking back is always
  // the only move, and never hard to find.
  const onlyMove = second !== null && before - second >= 15 && before < 97 && after > 25;
  return onlyMove && !takesBack(input) ? 'great' : 'best';
}

/** Whether the move takes on the square the opponent just took on. */
const takesBack = ({ previousPosition, position }: JudgeInput): boolean =>
  Boolean(previousPosition.san?.includes('x')) &&
  position.san.includes('x') &&
  previousPosition.uci?.slice(2, 4) === position.uci.slice(2, 4);

/** The mover had a mate too long to judge by distance, and doesn't reach it sooner. */
function keepsLongMate({ before, after, previousPosition }: JudgeInput): boolean {
  if (!('mate' in before)) return false;
  const sign = fenTurn(previousPosition.fen) === 'white' ? 1 : -1;
  const own = sign * before.mate;
  if (own <= SURE_MATE) return false;
  // The engine's line reaches the mate a move closer; a move that does better beat it.
  return !('mate' in after) || sign * after.mate >= own - 1;
}

// Win probability an error must lose for the opponent to have something to punish, the
// mover's own share for it to count, and how little the opponent's move in between loses.
export const PUNISHABLE = 10;
const AHEAD = 60;
const FORCED = 5;

// An error, by its class too: the engine's own move can read 10 points down
// where its records were taken at different depths (a cloud one beside ours).
const punishable = (move: MoveVerdict): boolean =>
  move.loss >= PUNISHABLE && isError(move.moveClass);

/**
 * Whether an error now fails to punish the opponent's: their move just before was an
 * error, or the mover was punishing one from three plies back, their reply no error (its
 * class, not its loss: the engine's move can read a few points down at another depth),
 * the opponent's move between all but forced.
 */
function inPunishment(previousMove: MoveVerdict | null | undefined, before: number): boolean {
  if (!previousMove || before < AHEAD) return false;
  if (punishable(previousMove)) return true;
  const own = previousMove.previousMove;
  return (
    previousMove.loss < FORCED &&
    own !== null &&
    !isError(own.moveClass) &&
    own.previousMove !== null &&
    punishable(own.previousMove)
  );
}

const isMistake = (moveClass: MoveClass): boolean =>
  moveClass === 'mistake' || moveClass === 'blunder';

function baseClass(input: JudgeInput, standing: Standing, isBest: boolean): MoveClass {
  if (input.book) return 'book';
  // Another way to a mate too long to judge by distance loses no win
  // probability, but it isn't the engine's move. A server analysis has no
  // engine move to tell.
  const otherWay = !isBest && input.before.best !== null;
  if (otherWay && standing.loss < 0.5 && keepsLongMate(input)) return 'excellent';
  if (isBest || standing.loss < 0.5) return topClass(input, standing);
  const moveClass = lossClass(standing.loss);
  return isMistake(moveClass) && inPunishment(input.previousMove, standing.before)
    ? 'miss'
    : moveClass;
}

/**
 * The move as a miss, if its error fails to punish the opponent's: for a move judged
 * before the moves it answers were linked, which `judge` couldn't see then. A verdict
 * from mate distances stands, and so does a blunder that lets a mate in.
 */
export function withMiss<T extends MoveVerdict>(move: T): T {
  if (move.slower || !isMistake(move.moveClass)) return move;
  if (letInMateClass(move.before, move.after, move.color) === 'blunder') return move;
  const before = forColor(move.before.whiteWinChance, move.color);
  return inPunishment(move.previousMove, before) ? { ...move, moveClass: 'miss' } : move;
}

/** Judges one move from the engine's records of the positions before and after it. */
export function judge(input: JudgeInput): MoveVerdict {
  const { previousPosition, position, before: recordBefore, after: recordAfter } = input;
  const color = fenTurn(previousPosition.fen);
  const before = forColor(recordBefore.whiteWinChance, color);
  const after = forColor(recordAfter.whiteWinChance, color);
  const loss = Math.max(0, before - after);
  const second =
    recordBefore.secondLineWinChance === null
      ? null
      : forColor(recordBefore.secondLineWinChance, color);
  const isBest =
    normalizeUci(position.uci, previousPosition.fen, input.chess960) === recordBefore.best;
  let moveClass = baseClass(input, { before, after, loss, second }, isBest);
  const mated = isBest || input.book ? null : mateVerdict(recordBefore, recordAfter, color);
  if (mated && RANK.indexOf(moveClass) < RANK.indexOf(mated)) moveClass = mated;
  const letIn = isBest || input.book ? null : letInMateClass(recordBefore, recordAfter, color);
  // A mate let in from a game still on is a blunder, even when it also lets a punishment go.
  if (letIn && RANK.indexOf(moveClass) < RANK.indexOf(letIn)) moveClass = letIn;
  return {
    ply: position.ply,
    san: position.san,
    uci: position.uci,
    color,
    moveClass,
    loss,
    slower: mated !== null && moveClass === mated,
    accuracy: moveClass === 'book' ? 100 : moveAccuracy(loss),
    best: recordBefore.best,
    bestSan: uciToSan(previousPosition.fen, recordBefore.best),
    before: recordBefore,
    after: recordAfter,
    position,
    previousPosition,
    previousMove: input.previousMove ?? null,
  };
}
