import { z } from 'zod/mini';
import type { Color } from '#shared/chess/types.ts';
import type { GameCourse } from '#page/lichess/analysis.ts';
import type { TreeNode } from '#page/lichess/tree.ts';
import { winPercent } from '#shared/chess/index.ts';

// What the analysis' two charts draw, from Lichess's own data: the server
// analysis' score of each position, and each move's time.

const ServerEvalSchema = z.union([z.object({ mate: z.number() }), z.object({ cp: z.number() })]);
const ClockSchema = z.number();

export interface AdvantagePoint {
  readonly ply: number;
  /** White's winning chances, 0 to 100. */
  readonly whiteWin: number;
  /** Lichess's score: centipawns or a mate, White's view. */
  readonly score: z.infer<typeof ServerEvalSchema>;
}

function whiteWinOf(score: AdvantagePoint['score'], ply: number): number {
  if ('cp' in score) return winPercent(score.cp);
  // Mate 0: the side to move is mated, White on an even ply.
  if (score.mate === 0) return ply % 2 === 0 ? 0 : 100;
  return score.mate > 0 ? 100 : 0;
}

/** Each position the server analysed, in order. */
export function advantagePoints(nodes: readonly TreeNode[]): AdvantagePoint[] {
  return nodes.flatMap(node => {
    const parsed = ServerEvalSchema.safeParse(node.eval);
    if (!parsed.success) return [];
    return [{ ply: node.ply, whiteWin: whiteWinOf(parsed.data, node.ply), score: parsed.data }];
  });
}

export interface MoveTime {
  readonly ply: number;
  readonly color: Color;
  /** The move as Lichess numbers it: "12. Nf3", "12... Nc6". */
  readonly san: string;
  readonly seconds: number;
  /** The mover's clock after the move, in seconds; null when Lichess has none. */
  readonly clock: number | null;
}

/** A move as Lichess numbers it: "12. Nf3", "12... Nc6". */
export const moveName = (ply: number, san: string): string =>
  `${Math.ceil(ply / 2)}${ply % 2 === 1 ? '.' : '...'} ${san}`;

/**
 * Each move's time. Lichess's `moveCentis` has one entry per move from the
 * game's start, and may end on the game's last action (a resignation), which
 * is no move.
 */
export function moveTimes(nodes: readonly TreeNode[], course: GameCourse): MoveTime[] {
  const centis = course.game.moveCentis ?? [];
  return centis.flatMap((time, i) => {
    const node = nodes[i + 1];
    if (!node?.san) return [];
    const clock = ClockSchema.safeParse(node.clock);
    return [
      {
        ply: node.ply,
        color: node.ply % 2 === 1 ? 'white' : 'black',
        san: moveName(node.ply, node.san),
        seconds: time / 100,
        clock: clock.success ? clock.data / 100 : null,
      },
    ];
  });
}

export interface Phases {
  /** The ply where the middlegame starts, if Lichess saw one. */
  readonly middle: number | null;
  readonly end: number | null;
}

export const phasesOf = (course: GameCourse): Phases => ({
  middle: course.game.division?.middle ?? null,
  end: course.game.division?.end ?? null,
});
