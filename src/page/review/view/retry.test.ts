import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Color } from '#shared/chess/index.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { parentPath } from '#page/lichess/tree.ts';
import { isError } from '#page/review/classes/classes.ts';
import { forColor, type PositionRecord } from '#page/review/evaluation/score.ts';
import type { FakeController } from '#page/review/fixtures/fake-lichess.ts';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import { seedBooks } from '#page/review/game/work.ts';
import { judgeAt } from '#page/review/live/judging.ts';
import type { JudgedMove, Session } from '#page/review/session.ts';
import {
  askHint,
  canRetry,
  endRetry,
  followRetry,
  retryOutcome,
  revealRetry,
  startRetry,
} from './retry.ts';
import { HINTS } from './retry-hint.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
  vi.useRealTimers();
});

// The opera game's Rxd7 (ply 25, a mistake): the error with the most left to
// lose, so a move tried in its place can be judged anywhere from excellent to
// blunder. Its own best is Bxf6, and a3 is a move that is neither.
const MISTAKE_PLY = 25;
const OTHER_MOVE = 'a2a3';

interface Retrying {
  readonly session: Session;
  readonly ctrl: FakeController;
  readonly facade: Analysis;
  readonly move: JudgedMove;
  /** The error's own path, the retry's. */
  readonly path: string;
}

/** The game's moves, which are all judged once the analysis is in. */
const judgedMoves = (session: Session): readonly JudgedMove[] =>
  (session.view.review?.moves ?? []).flatMap(move => (move ? [move] : []));

/** The opera game, judged, with a retry started on its mistake. */
function retrying(): Retrying {
  const { session, ctrl, facade } = judgedGame('opera');
  // As the review does: without the game's own book moves, a move played off
  // it stays unjudged, since the masters database isn't asked in a test.
  seedBooks(session, facade);
  const move = session.view.review?.moves[MISTAKE_PLY - 1];
  if (!move || !canRetry(move, facade)) throw new Error('that move is no longer a retriable error');
  ctrl.jumpToMain(MISTAKE_PLY);
  const { path } = facade;
  startRetry(session, facade, move);
  return { session, ctrl, facade, move, path };
}

/**
 * What the engine says of the position on the board: the mover is left `own`
 * win chance. Only the win probability is judged, so the centipawns just have
 * to be a score and not a mate.
 */
const leaving = (own: number, color: Color): PositionRecord => ({
  cp: 0,
  whiteWinChance: forColor(own, color),
  secondLineWinChance: null,
  best: null,
  line: [],
});

/** Plays `uci` from the position before the error, the engine's record of what it reaches. */
function play({ session, facade, move }: Retrying, uci: string, own?: number): void {
  facade.playUci(uci);
  if (own === undefined) return;
  session.live.evals.set(facade.node.fen, leaving(own, move.color));
  // A record just taken has the moves judged again, as game/work.ts does.
  session.live.judged.clear();
}

describe('offering a retry', () => {
  it('offers one on every error the engine has a better move for, and on nothing else', () => {
    const { session, facade } = judgedGame('opera');
    const moves = judgedMoves(session);
    expect(moves.length).toBeGreaterThan(20);
    expect(moves.map(move => canRetry(move, facade))).toEqual(
      moves.map(move => isError(move.moveClass) && move.best !== null),
    );
    expect(canRetry(null, facade)).toBe(false);
  });

  it('offers none where the board can’t play moves, as on a game page', () => {
    const { session, ctrl, facade } = judgedGame('opera');
    Reflect.deleteProperty(ctrl, 'playUci');
    expect(judgedMoves(session).some(move => canRetry(move, facade))).toBe(false);
  });
});

describe('a retry on the board', () => {
  it('takes the board back before the error, and puts the other answers away', () => {
    const { session, ctrl, facade } = judgedGame('opera');
    const move = session.view.review?.moves[MISTAKE_PLY - 1];
    if (!move) throw new Error('no such move');
    ctrl.jumpToMain(MISTAKE_PLY);
    const { path } = facade;
    session.view.explain = true;
    session.view.bestOf = { path, move };
    session.view.lineOf = { path, move, line: [] };
    startRetry(session, facade, move);
    expect(facade.path).toBe(parentPath(path));
    expect(session.view.retry).toEqual({
      path,
      move,
      misses: 0,
      counted: null,
      hints: 0,
      revealed: false,
    });
    expect([session.view.explain, session.view.bestOf, session.view.lineOf]).toEqual([
      false,
      null,
      null,
    ]);
  });

  it('asks for its hints one at a time, and has two to give', () => {
    const { session, facade, move } = retrying();
    askHint(session);
    expect(session.view.retry?.hints).toBe(1);
    askHint(session);
    askHint(session);
    expect(session.view.retry?.hints).toBe(HINTS);
    // A new retry starts with none given away.
    endRetry(session, facade, false);
    startRetry(session, facade, move);
    expect(session.view.retry?.hints).toBe(0);
  });

  it('waits for a move there, and says nothing of a board that has left', () => {
    const context = retrying();
    const { session, ctrl, facade } = context;
    expect(retryOutcome(session, facade)).toEqual({ kind: 'waiting' });
    ctrl.jumpToMain(10);
    expect(retryOutcome(session, facade)).toBeNull();
  });

  it('reads the game’s own move, played again, as the same move', () => {
    const context = retrying();
    play(context, context.move.uci);
    expect(context.facade.path).toBe(context.path);
    expect(retryOutcome(context.session, context.facade)).toEqual({ kind: 'same' });
  });

  it('reads the engine’s move as found', () => {
    const context = retrying();
    const { move } = context;
    if (!move.best) throw new Error('that error has no better move');
    play(context, move.best);
    expect(retryOutcome(context.session, context.facade)).toEqual({
      kind: 'found',
      san: move.bestSan,
      best: true,
    });
  });

  it('waits for the verdict of another move, then reads an error as wrong', () => {
    const context = retrying();
    const { session, facade, move } = context;
    expect(OTHER_MOVE).not.toBe(move.uci);
    expect(OTHER_MOVE).not.toBe(move.best);
    play(context, OTHER_MOVE);
    expect(retryOutcome(session, facade)).toEqual({ kind: 'checking' });
    // The move throws the win away: 93 chances out of 100 down to 50.
    session.live.evals.set(facade.node.fen, leaving(50, move.color));
    session.live.judged.clear();
    const outcome = retryOutcome(session, facade);
    expect(outcome?.kind).toBe('wrong');
    expect(outcome?.kind === 'wrong' && outcome.tried.moveClass).toBe('blunder');
  });

  it('reads a move that keeps the win as found too, though it isn’t the engine’s', () => {
    const context = retrying();
    const { session, facade, move } = context;
    const own = forColor(move.before.whiteWinChance, move.color);
    // A single win chance behind the engine's move: excellent, not an error.
    play(context, OTHER_MOVE, own - 1);
    expect(retryOutcome(session, facade)).toEqual({
      kind: 'found',
      san: facade.node.san,
      best: false,
    });
  });

  it('reads a move that is no longer an error as found, short of excellent', () => {
    const context = retrying();
    const { session, facade, move } = context;
    const own = forColor(move.before.whiteWinChance, move.color);
    // Three win chances behind the engine's move: judged good, which the
    // mistake retried here isn't. The player put the game right.
    play(context, OTHER_MOVE, own - 3);
    const outcome = retryOutcome(session, facade);
    expect(judgeAt(session.live, facade, facade.path)?.moveClass).toBe('good');
    expect(outcome).toEqual({ kind: 'found', san: facade.node.san, best: false });
  });

  it('reads the answer, once shown, as revealed rather than found', () => {
    const context = retrying();
    const { session, facade, move } = context;
    revealRetry(session, facade);
    expect(session.view.retry?.revealed).toBe(true);
    expect(facade.node.san).toBe(move.bestSan);
    expect(retryOutcome(session, facade)).toEqual({ kind: 'revealed', san: move.bestSan });
  });
});

describe('a retry as the board moves', () => {
  it('counts a miss once, however often it follows the board, and takes it back', () => {
    vi.useFakeTimers();
    const context = retrying();
    const { session, facade, move } = context;
    play(context, OTHER_MOVE, 50);
    const missed = facade.path;
    followRetry(session, facade);
    followRetry(session, facade);
    expect(session.view.retry).toMatchObject({ misses: 1, counted: missed });
    vi.advanceTimersByTime(2000);
    expect(facade.path).toBe(parentPath(context.path));
    expect(session.view.retry?.revealed).toBe(false);
    // Back before the error, the miss on the board is no longer counted.
    followRetry(session, facade);
    expect(session.view.retry?.counted).toBeNull();
    expect(move.best).not.toBe(OTHER_MOVE);
  });

  it('never plays the answer in the player’s place, however many misses', () => {
    vi.useFakeTimers();
    const context = retrying();
    const { session, facade, move } = context;
    for (let miss = 0; miss < 4; miss++) {
      play(context, OTHER_MOVE, 50);
      expect(retryOutcome(session, facade)?.kind).toBe('wrong');
      followRetry(session, facade);
      vi.advanceTimersByTime(2000);
      // Back before the error, with the answer still to be found.
      expect(facade.path).toBe(parentPath(context.path));
      expect(session.view.retry?.revealed).toBe(false);
      expect(facade.node.san).not.toBe(move.bestSan);
      followRetry(session, facade);
    }
    expect(session.view.retry?.misses).toBe(4);
  });

  it('ends once the board has left the error behind', () => {
    const { session, ctrl, facade } = retrying();
    ctrl.jumpToMain(10);
    followRetry(session, facade);
    expect(session.view.retry).toBeNull();
  });
});

describe('ending a retry', () => {
  it('goes on with the game, to the move after the error', () => {
    const { session, facade, move } = retrying();
    endRetry(session, facade, true);
    expect(session.view.retry).toBeNull();
    expect(facade.node.ply).toBe(move.ply + 1);
  });

  it('goes back onto the error itself', () => {
    const { session, facade, path } = retrying();
    endRetry(session, facade, false);
    expect(session.view.retry).toBeNull();
    expect(facade.path).toBe(path);
  });
});
