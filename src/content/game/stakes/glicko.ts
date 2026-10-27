// One game's Glicko-2 update, as scalachess computes it (rating/glicko/impl):
// Lichess rates each game alone and skips the deviation's increase, so the
// volatility, which no page shows, has no part in the result.

const SCALE = 173.7178;
const BASE = 1500;

export interface Glicko {
  readonly rating: number;
  readonly deviation: number;
}

export interface GlickoGame {
  readonly player: Glicko;
  readonly opponent: Glicko;
  /** 1 for a win, 0.5 for a draw, 0 for a loss. */
  readonly score: number;
  /** Points the player's side is worth for the expected score; the opponent's is its negation. */
  readonly advantage: number;
}

const weight = (deviation: number): number =>
  1 / Math.sqrt(1 + (3 * deviation ** 2) / Math.PI ** 2);

/** The player's rating after the game. */
export function ratingAfter({ player, opponent, score, advantage }: GlickoGame): number {
  const mu = (player.rating + advantage - BASE) / SCALE;
  const opponentMu = (opponent.rating - advantage - BASE) / SCALE;
  const phi = player.deviation / SCALE;
  const opponentWeight = weight(opponent.deviation / SCALE);
  const expected = 1 / (1 + Math.exp(-opponentWeight * (mu - opponentMu)));
  const variance = 1 / (opponentWeight ** 2 * expected * (1 - expected));
  const newPhi = 1 / Math.sqrt(1 / phi ** 2 + 1 / variance);
  return player.rating + SCALE * newPhi ** 2 * opponentWeight * (score - expected);
}
