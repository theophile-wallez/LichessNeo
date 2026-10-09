import { z } from 'zod/mini';
import { COLORS, type Color } from '#shared/chess/types.ts';
import { isParsing, setData, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { parseJson } from '#shared/json.ts';
import { readPageInitData } from '#shared/page-init-data.ts';

// The color(s) the computer plays, in `data-lr-ext-ai` on <html>, so its player
// bar gets the computer's robot as its avatar (styles/playerbar.css), in the
// colors of its level, in `data-lr-ext-ai-level`.
// Lichess draws that bar like an anonymous player's, and only the game's data
// tells them apart. The estimated rating of its level goes in `--lr-ext-ai-<color>`
// for the bar, and into the game info (game-meta.ts). Every level's is in
// `--lr-ext-ai-level-<level>` for the game setup (styles/pages/setup-options.css).

// Lichess shows no rating for its levels since 2022. These are the over-the-board
// estimates a Lichess developer gave for the current engine settings (forum,
// "How strong are the stockfish levels?", 2024); the first three are rough.
export const AI_RATINGS: readonly string[] = [
  '~400',
  '~500',
  '~800',
  '~1100',
  '~1500',
  '~1900',
  '~2300',
  '2800+',
];

// A seat is the computer's when it has a level (`ai`).
const ComputerSchema = z.object({ color: z.enum(COLORS), ai: z.number() });
const GameDataSchema = z.object({ player: z.unknown(), opponent: z.unknown() });
// The game page's data is at the top, the analysis board's in its cfg.
const PageInitSchema = z.union([
  z.object({ data: GameDataSchema }),
  z.object({ cfg: z.object({ data: GameDataSchema }) }),
]);

export interface ComputerPlayer {
  readonly color: Color;
  /** Stockfish's level, 1 to 8. */
  readonly level: number;
  readonly rating: string | undefined;
}

/** The computer's seats in a game page's init data, with their level's rating. */
export function readComputerPlayers(initData: string | null): ComputerPlayer[] {
  const init = parseJson(initData, PageInitSchema);
  if (!init) return [];
  const { player, opponent } = 'data' in init ? init.data : init.cfg.data;
  return [player, opponent].flatMap(seat => {
    const computer = ComputerSchema.safeParse(seat);
    if (!computer.success || computer.data.ai === 0) return [];
    const { color, ai } = computer.data;
    return [{ color, level: ai, rating: AI_RATINGS[ai - 1] }];
  });
}

const ratings = new Map<Color, string>();

/** The rating shown for each color the computer plays, in the order of the game's data. */
export const computerRatings = (): ReadonlyMap<Color, string> => ratings;

export function markComputerPlayers(players: readonly ComputerPlayer[]): void {
  if (players.length === 0) return;
  const root = document.documentElement;
  setData(root, 'lrExtAi', players.map(({ color }) => color).join(' '));
  setData(root, 'lrExtAiLevel', players[0] ? String(players[0].level) : null);
  for (const { color, rating } of players) {
    if (rating === undefined) continue;
    ratings.set(color, rating);
    setStyleProperty(root, `--lr-ext-ai-${color}`, `"${rating}"`);
  }
}

/** Every level's rating, for the game setup's level picker. */
export function markLevelRatings(): void {
  const root = document.documentElement;
  for (const [index, rating] of AI_RATINGS.entries())
    setStyleProperty(root, `--lr-ext-ai-level-${index + 1}`, `"${rating}"`);
}

export const aiPlayers: Feature = {
  name: 'computer players',
  start: () => {
    markLevelRatings();
    // Lichess removes its init data once read, so only a script running while
    // the page parses sees it.
    if (!isParsing()) return;
    readPageInitData(text => markComputerPlayers(readComputerPlayers(text)));
  },
};
