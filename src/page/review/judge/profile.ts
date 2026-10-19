import type { Color } from '#shared/chess/index.ts';
import { forColor } from '#page/review/evaluation/score.ts';
import { divide } from '#page/review/rating/phases.ts';
import { playerAccuracy } from './summary.ts';
import type { MoveVerdict } from './types.ts';

// A player's game in six scores, 0 to 100, for the summary's radar: the
// accuracy of each phase and of the moves played worse off or better off,
// and the share of the tactical chances found. A score with no move to
// stand on is null.

export const PROFILE_AXES = [
  'opening',
  'middlegame',
  'endgame',
  'tactics',
  'defense',
  'conversion',
] as const;
export type ProfileAxis = (typeof PROFILE_AXES)[number];

export type Profile = Readonly<Record<ProfileAxis, number | null>>;

export type ProfileMove = Pick<
  MoveVerdict,
  'ply' | 'color' | 'moveClass' | 'accuracy' | 'before' | 'previousPosition'
>;

/** Under this share of winning chances the mover defends; over 100 minus it, they convert. */
const WORSE_OFF = 35;

const FOUND = new Set(['brilliant', 'great']);

function accuracyOf(moves: readonly ProfileMove[], color: Color): number | null {
  return playerAccuracy(moves, color);
}

/** The share of the tactical chances `color` took: brilliant and great moves against misses. */
function chancesFound(moves: readonly ProfileMove[]): number | null {
  const found = moves.filter(move => FOUND.has(move.moveClass)).length;
  const missed = moves.filter(move => move.moveClass === 'miss').length;
  return found + missed === 0 ? null : (100 * found) / (found + missed);
}

/** Each axis's score for `color`, over the game's judged moves in order. */
export function playerProfile(moves: readonly ProfileMove[], color: Color): Profile {
  // Lichess's phases, from the position each move was played from.
  const { middle, end } = divide(moves.map(move => move.previousPosition.fen));
  const index = (move: ProfileMove): number => move.ply - 1;
  const inEndgame = (move: ProfileMove): boolean => end >= 0 && index(move) >= end;
  const inOpening = (move: ProfileMove): boolean =>
    !inEndgame(move) && (middle < 0 || index(move) < middle);
  const own = moves.filter(move => move.color === color);
  const chances = (move: ProfileMove): number => forColor(move.before.whiteWinChance, color);
  return {
    opening: accuracyOf(own.filter(inOpening), color),
    middlegame: accuracyOf(
      own.filter(move => !inOpening(move) && !inEndgame(move)),
      color,
    ),
    endgame: accuracyOf(own.filter(inEndgame), color),
    tactics: chancesFound(own),
    defense: accuracyOf(
      own.filter(move => chances(move) < WORSE_OFF),
      color,
    ),
    conversion: accuracyOf(
      own.filter(move => chances(move) > 100 - WORSE_OFF),
      color,
    ),
  };
}
