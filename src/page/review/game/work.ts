import type { Analysis } from '#page/lichess/analysis.ts';
import type { TreeNode } from '#page/lichess/tree.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { rateGame } from '#page/review/rating/rate-game.ts';
import type { GameWork, JudgedMove, Session } from '#page/review/session.ts';
import { buildReview } from './build.ts';

// The game's analysis as it fills in. A deep record is never replaced, so a
// move, once judged, stays as it is.

/**
 * How far `node` is from the game's start, the review's index of a position.
 * Lichess numbers a game from a position from its FEN's move: there the
 * tree's root isn't ply 0.
 */
export const plyIndex = ({ nodes }: GameWork, node: TreeNode): number =>
  node.ply - (nodes[0]?.ply ?? 0);

/**
 * The index of `node` in the game, null for a position that isn't the game's.
 * A move played on from the game's last one extends Lichess's mainline, so
 * `onMainline` isn't enough: such a move has no verdict in the review, and is
 * judged like a variation's.
 */
export function gameIndex(work: GameWork, node: TreeNode): number | null {
  const index = plyIndex(work, node);
  return work.nodes[index] === node ? index : null;
}

export const isGameNode = (work: GameWork, node: TreeNode): boolean =>
  gameIndex(work, node) !== null;

/** The tree path to the game's position at `index`, its last at most. */
export const gamePath = ({ nodes }: GameWork, index: number): string =>
  nodes
    .slice(1, Math.max(0, index) + 1)
    .map(node => node.id)
    .join('');

/** A full-depth record just taken: the moves played off the game are judged from it too. */
export function seeDeep(session: Session, index: number, record: PositionRecord): void {
  const { work, live } = session;
  const node = work.nodes[index];
  if (node) live.evals.set(node.fen, record);
  live.judged.clear();
}

/**
 * Records the game's book moves for the moves played off it, so the masters
 * database isn't asked about them.
 */
export function seedBooks(session: Session): void {
  const { live, work, view } = session;
  const { nodes, bookPly } = work;
  for (let i = 1; i <= bookPly && i < nodes.length; i++) {
    const node = nodes[i];
    if (node)
      live.books.set(node.fen, {
        book: true,
        name: i === bookPly ? view.openingName : '',
        eco: '',
      });
  }
  const out = nodes[bookPly + 1];
  if (out) live.books.set(out.fen, { book: false, name: '', eco: '' });
  live.judged.clear();
}

function rate(
  analysis: Analysis,
  work: GameWork,
  moves: readonly JudgedMove[],
): ReturnType<typeof rateGame> {
  const players = analysis.players();
  return rateGame({
    speed: analysis.data?.game.speed,
    // The game's, not Lichess's mainline, which the moves played past its end extend.
    fens: work.nodes.map(node => node.fen),
    moves,
    ratings: { white: players.white?.rating, black: players.black?.rating },
  });
}

/** Judges what's newly in and rebuilds the review from what's known. */
export function refresh(session: Session, analysis: Analysis): void {
  const { work, view } = session;
  const review = buildReview({
    ...work,
    chess960: analysis.chess960,
    previous: view.review,
    rate: moves => rate(analysis, work, moves),
  });
  view.review = review;
  view.progress = work.deep.filter(Boolean).length / work.nodes.length;
  view.version++;
  if (review.complete) view.revealed.add('summary');
}
