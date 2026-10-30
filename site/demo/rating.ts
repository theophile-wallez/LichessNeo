import { chesscomRating } from '#shared/chesscom-rating/convert.ts';
import { queryAll } from '#shared/dom.ts';
import type { Color } from '#shared/chess/types.ts';
import { flowTo } from './motion/flow.ts';
import { rateGame } from '#page/review/rating/rate-game.ts';
import { moves, positions } from './review.ts';

// The rating each side of the demo's game played at, as the review's summary
// rates a game from its moves (page/review/rating), each phase with its
// verdict; and the same rating as on Chess.com, which the extension can show
// in place of every Lichess rating.

// An over-the-board game with no clock: rated as a classical one.
export const SPEED = 'classical';

export const rating = rateGame({
  speed: SPEED,
  fens: positions.map(position => position.fen),
  moves,
  ratings: {},
});

/** The rating `color` played at, as on Lichess and as on Chess.com. */
export function playedLike(color: Color): { lichess: number; chesscom: number } | null {
  const rated = rating[color];
  if (!rated) return null;
  return { lichess: rated.elo, chesscom: chesscomRating(SPEED, rated.elo)?.rating ?? rated.elo };
}

/** The bars' ratings as on Chess.com, or back as on Lichess. */
export function showChesscom(on: boolean): void {
  for (const value of queryAll(document, '[data-chesscom]', HTMLElement))
    flowTo(value, Number(on ? value.dataset.chesscom : value.dataset.lichess), {
      format: { useGrouping: false },
    });
}
