import { z } from 'zod/mini';
import { parseJson } from '#shared/json.ts';
import { lenient } from '#shared/zod.ts';
import { winPercent } from '#shared/chess/index.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';

// The game's export (/game/export/<id>): its opening, and Lichess's server
// analysis when someone asked for one.

const GameExportSchema = z.object({
  opening: lenient(
    z.object({
      ply: lenient(z.number()),
      name: lenient(z.string()),
      eco: lenient(z.string()),
    }),
  ),
  // One entry per position after a move, White's view.
  analysis: lenient(z.array(z.object({ mate: lenient(z.number()), eval: lenient(z.number()) }))),
});

export interface GameExport {
  /** The last book move's ply, 0 for none. */
  readonly bookPly: number;
  readonly openingName: string;
  readonly openingEco: string;
  /** The server's records by position index, for the graph: no second line, no best move. */
  readonly rough: readonly (PositionRecord | undefined)[];
}

const EXPORT_TIMEOUT_MS = 8000;

const exportUrl = (gameId: string): string =>
  `/game/export/${gameId}?opening=true&moves=false&clocks=false&evals=true`;

/** Reads the export's text; null when it isn't one (Lichess's error page). */
export function readExport(text: string, positions: number): GameExport | null {
  const parsed = parseJson(text, GameExportSchema);
  if (!parsed) return null;
  const rough: (PositionRecord | undefined)[] = [];
  for (const [i, entry] of (parsed.analysis ?? []).entries()) {
    if (i + 1 >= positions) continue;
    if (entry.mate !== undefined)
      rough[i + 1] = {
        mate: entry.mate,
        whiteWinChance: entry.mate > 0 ? 100 : 0,
        secondLineWinChance: null,
        best: null,
      };
    else if (entry.eval !== undefined)
      rough[i + 1] = {
        cp: entry.eval,
        whiteWinChance: winPercent(entry.eval),
        secondLineWinChance: null,
        best: null,
      };
  }
  return {
    bookPly: parsed.opening?.ply ?? 0,
    openingName: parsed.opening?.name ?? '',
    openingEco: parsed.opening?.eco ?? '',
    rough,
  };
}

export async function fetchExport(gameId: string, positions: number): Promise<GameExport | null> {
  const response = await fetch(exportUrl(gameId), {
    headers: { Accept: 'application/json' },
    // The analysis waits for it: a request that hangs mustn't hold it up.
    signal: AbortSignal.timeout(EXPORT_TIMEOUT_MS),
  });
  return readExport(await response.text(), positions);
}
