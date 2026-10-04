import { z } from 'zod/mini';
import { COLORS } from '#shared/chess/types.ts';
import { parseJson } from '#shared/json.ts';

// A game once it's over, as the page of a finished game (`/<id>`) serves it:
// its status and winner, and every position. The game page's own data stops
// at the moves played before it loaded.

const PositionSchema = z.object({
  ply: z.number(),
  fen: z.string(),
  uci: z.optional(z.string()),
  san: z.optional(z.string()),
});

const FinishedPageSchema = z.object({
  cfg: z.object({
    data: z.object({
      game: z.object({
        status: z.object({ name: z.string() }),
        winner: z.optional(z.enum(COLORS)),
        variant: z.object({ key: z.string() }),
      }),
      treeParts: z.array(PositionSchema),
    }),
  }),
});

export type FinishedGame = z.infer<typeof FinishedPageSchema>['cfg']['data'];

// The init data is JSON in a script element, which can't hold `</script>`.
const INIT_DATA = /<script[^>]*\bid="page-init-data"[^>]*>([\s\S]*?)<\/script>/;

/** The game in a finished game's init data, or null for any other page's. */
export const parseFinishedGame = (initData: string | null | undefined): FinishedGame | null =>
  parseJson(initData, FinishedPageSchema)?.cfg.data ?? null;

/** The game in a finished game's page, or null for any other page. */
export const readFinishedGame = (page: string): FinishedGame | null =>
  parseFinishedGame(INIT_DATA.exec(page)?.[1]);

// The page can lag the game's end by a moment: try again, a second apart.
const MAX_TRIES = 5;
const RETRY_MS = 1000;

const wait = (milliseconds: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });

async function fetchOnce(gameId: string): Promise<FinishedGame | null> {
  try {
    const response = await fetch(`/${gameId}`);
    return response.ok ? readFinishedGame(await response.text()) : null;
  } catch {
    return null;
  }
}

/** The finished game, once its page says it's over; null if it never does. */
export async function fetchFinishedGame(
  gameId: string,
  isOver: (game: FinishedGame) => boolean,
): Promise<FinishedGame | null> {
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    const game = await fetchOnce(gameId);
    if (game && isOver(game)) return game;
    if (attempt < MAX_TRIES) await wait(RETRY_MS);
  }
  return null;
}
