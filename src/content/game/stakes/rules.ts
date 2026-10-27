import { opposite, type Color } from '#shared/chess/types.ts';
import { clamp } from '#shared/math.ts';
import { ratingAfter } from './glicko.ts';
import type { RatedGame, RatedPlayer } from './round.ts';

// What a rated game is worth to each player, by Lichess's rules (lila's
// PerfsUpdater, RatingRegulator and Glicko).

/** Elo points White gets for moving first, in the variants that have them. */
const COLOR_ADVANTAGE: Readonly<Record<string, number>> = {
  standard: 11.782457,
  crazyhouse: 20.30966,
};

/** How much Lichess inflates a gain, per perf, against rating deflation. */
const GAIN_FACTOR: Readonly<Record<string, number>> = {
  rapid: 1.015,
  classical: 1.01,
  blitz: 1.005,
  bullet: 1.01,
  ultraBullet: 1.013,
  atomic: 1.02,
  antichess: 1.02,
};

const MIN_RATING = 400;
const MIN_DEVIATION = 45;
const MAX_DEVIATION = 500;
const MAX_DELTA = 700;

export interface Stakes {
  readonly win: number;
  readonly draw: number;
  readonly loss: number;
}

interface Pairing {
  readonly player: RatedPlayer;
  readonly opponent: RatedPlayer;
  readonly perf: string;
  /** The player's share of the color advantage; the opponent's is its negation. */
  readonly advantage: number;
}

// Lichess caps what it reads before rating the game.
const capped = ({ glicko }: RatedPlayer) => ({
  rating: Math.max(glicko.rating, MIN_RATING),
  deviation: clamp(glicko.deviation, MIN_DEVIATION, MAX_DEVIATION),
});

function change(pairing: Pairing, score: number): number {
  const { player, opponent } = pairing;
  const before = capped(player).rating;
  let after = ratingAfter({
    player: capped(player),
    opponent: capped(opponent),
    score,
    advantage: pairing.advantage,
  });
  if (after > before) after = before + (after - before) * (GAIN_FACTOR[pairing.perf] ?? 1);
  // A human playing a bot moves half as far.
  if (!player.bot && opponent.bot) after = (after + before) / 2;
  after = Math.max(clamp(after, before - MAX_DELTA, before + MAX_DELTA), MIN_RATING);
  // Lichess shows the change between whole ratings, each rounded down.
  return Math.trunc(after) - Math.trunc(player.glicko.rating);
}

/** What each player of `game` wins, draws and loses. */
export function gameStakes(game: RatedGame): Readonly<Record<Color, Stakes>> {
  const whiteAdvantage = (COLOR_ADVANTAGE[game.variant] ?? 0) / 2;
  const stakesOf = (color: Color): Stakes => {
    const pairing: Pairing = {
      player: game.players[color],
      opponent: game.players[opposite(color)],
      perf: game.perf,
      advantage: color === 'white' ? whiteAdvantage : -whiteAdvantage,
    };
    return { win: change(pairing, 1), draw: change(pairing, 0.5), loss: change(pairing, 0) };
  };
  return { white: stakesOf('white'), black: stakesOf('black') };
}
