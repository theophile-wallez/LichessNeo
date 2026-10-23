import type { Color } from '#shared/chess/index.ts';
import { forColor } from '#page/review/evaluation/score.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { type PhaseKey, ratingModel, type Speed } from './model.ts';
import { bandOdds, posteriorMean, RATING_GRID } from './odds.ts';
import { divide, type Division, type Phase, PHASES } from './phases.ts';
import { isTactical } from './tactical.ts';

// The "Game Rating": the rating a player played at in one game, and a verdict
// per phase against what's expected at their rating. A game's moves make a
// likelihood over the level it was played at, drawn around the player's
// rating; the estimate is the posterior's mean. Without a rating (an
// anonymous player, the AI) the population is the prior. As in fit.py, the
// moves of a game already lost for good don't count: weaker players play on
// to the mate where stronger ones resign, so the easy best moves played there
// would read as a weak player's.

export type PhaseVerdict =
  | 'book'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

interface PlayerRating {
  readonly elo: number;
  /** Null for a phase the player made no move in. */
  readonly phases: Readonly<Record<Phase, PhaseVerdict | null>>;
}

export type GameRating = Readonly<Record<Color, PlayerRating | null>>;

type RatedMove = Pick<
  MoveVerdict,
  'color' | 'moveClass' | 'ply' | 'loss' | 'before' | 'previousPosition'
>;

export interface GameRatingInput {
  /** Lichess's speed (`ctrl.data.game.speed`). */
  readonly speed: string | undefined;
  /** The mainline's positions, the start first. */
  readonly fens: readonly string[];
  /** Every mainline move, judged at full depth. */
  readonly moves: readonly RatedMove[];
  readonly ratings: Readonly<Partial<Record<Color, number | undefined>>>;
}

const SPEEDS: ReadonlyMap<string, Speed> = new Map([
  ['ultraBullet', 'bullet'],
  ['bullet', 'bullet'],
  ['blitz', 'blitz'],
  ['rapid', 'rapid'],
  ['classical', 'classical'],
  ['correspondence', 'classical'],
]);

const PHASE_KEYS: Readonly<Record<Phase, PhaseKey>> = {
  opening: 'o',
  tactics: 't',
  strategy: 's',
  endgame: 'e',
};

// The upper ends of the loss bands (best … blunder), as in fit.py.
const LOSS_BANDS = [0.5, 2, 5, 10, 20];
const VERDICTS: readonly PhaseVerdict[] = ['best', 'excellent', 'good', 'inaccuracy', 'mistake'];
// The mover's win chance under which a move isn't counted, as in fit.py.
const LOST_FOR_GOOD = 2;

interface ScoredMove {
  readonly color: Color;
  readonly phase: Phase | 'book';
  readonly context: number;
  readonly band: number;
  /** Out of the book, and not in a game already lost for good. */
  readonly counted: boolean;
}

function movePhase(move: RatedMove, previous: RatedMove | undefined, division: Division): Phase {
  // The phase of the position the move was played from.
  const index = move.ply - 1;
  if (division.end >= 0 && index >= division.end) return 'endgame';
  if (division.middle < 0 || index < division.middle) return 'opening';
  const previousLoss = previous && previous.moveClass !== 'book' ? previous.loss : 0;
  return isTactical(move.previousPosition.fen, previousLoss) ? 'tactics' : 'strategy';
}

function standingIndex(winChance: number): number {
  if (winChance < 20) return 0;
  return winChance > 80 ? 2 : 1;
}

function scoreMoves(moves: readonly RatedMove[], division: Division): ScoredMove[] {
  return moves.map((move, i) => {
    const { color } = move;
    if (move.moveClass === 'book')
      return { color, phase: 'book', context: 0, band: 0, counted: false };
    const phase = movePhase(move, moves[i - 1], division);
    const before = forColor(move.before.whiteWinChance, color);
    // Lost, level or winning: in a won position even a blunder costs little.
    const context = PHASES.indexOf(phase) * 3 + standingIndex(before);
    const band = LOSS_BANDS.findIndex(limit => move.loss < limit);
    const counted = before >= LOST_FOR_GOOD;
    return { color, phase, context, band: band < 0 ? LOSS_BANDS.length : band, counted };
  });
}

// Without a rating (none, or 0) the population is the prior.
const knownRating = (rating: number | undefined): number | null =>
  rating === undefined || rating === 0 ? null : rating;

interface Rater {
  readonly likelihood: (moves: readonly ScoredMove[]) => number[];
  readonly speed: Speed;
}

function phaseVerdict(
  rater: Rater,
  moves: readonly ScoredMove[],
  anchor: number,
  phase: Phase,
): PhaseVerdict {
  const model = ratingModel();
  const gain = posteriorMean(rater.likelihood(moves), anchor, model.tau[rater.speed]) - anchor;
  const cut = model.cuts[PHASE_KEYS[phase]].findIndex(limit => gain >= limit);
  return VERDICTS[cut] ?? 'blunder';
}

function ratePlayer(
  rater: Rater,
  own: readonly ScoredMove[],
  rating: number | null,
): PlayerRating | null {
  const played = own.filter(move => move.counted);
  if (played.length === 0) return null;
  const model = ratingModel();
  const tau = model.tau[rater.speed];
  const [popMean, popDeviation] = model.pop[rater.speed];
  const likelihood = rater.likelihood(played);
  const estimate =
    rating === null
      ? posteriorMean(likelihood, popMean, Math.hypot(popDeviation, tau))
      : posteriorMean(likelihood, rating, tau);
  // An unrated player's phases are measured against their whole game.
  const anchor = rating ?? estimate;
  const verdict = (phase: Phase): PhaseVerdict | null => {
    const inPhase = played.filter(move => move.phase === phase);
    if (inPhase.length > 0) return phaseVerdict(rater, inPhase, anchor, phase);
    return phase === 'opening' && own.some(move => move.phase === 'book') ? 'book' : null;
  };
  const phases = {
    opening: verdict('opening'),
    tactics: verdict('tactics'),
    strategy: verdict('strategy'),
    endgame: verdict('endgame'),
  };
  return { elo: Math.round(estimate / 50) * 50, phases };
}

/** Each player's game rating and phase verdicts, once every move is judged. */
export function rateGame(input: GameRatingInput): GameRating {
  const speed = SPEEDS.get(input.speed ?? '') ?? 'blitz';
  const odds = bandOdds(speed);
  const scored = scoreMoves(input.moves, divide(input.fens));
  const likelihood = (moves: readonly ScoredMove[]): number[] =>
    RATING_GRID.map((_, index) =>
      moves.reduce((sum, move) => sum + (odds[move.context]?.[index]?.[move.band] ?? 0), 0),
    );
  const rater: Rater = { likelihood, speed };
  const rate = (color: Color): PlayerRating | null =>
    ratePlayer(
      rater,
      scored.filter(move => move.color === color),
      knownRating(input.ratings[color]),
    );
  return { white: rate('white'), black: rate('black') };
}
