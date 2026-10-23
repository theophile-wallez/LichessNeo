import { z } from 'zod/mini';
import type { Color } from '#shared/chess/types.ts';
import { createGuard } from '#shared/guards.ts';
import { method } from './method.ts';

// Lichess's opening explorer (ui/analyse/src/explorer/explorerCtrl.ts), the
// analysis controller's `explorer`, as a typed facade. It looks up the board's
// position whenever the board moves, while it's on, in the database its tabs
// pick (the masters', Lichess's players' under its filters, or one player's),
// and answers a signed-in user only: signed out, every position has no games.

export const ExplorerDbSchema = z.enum(['masters', 'lichess', 'player']);
export type ExplorerDb = z.infer<typeof ExplorerDbSchema>;

const OpeningSchema = z.object({ eco: z.string(), name: z.string() });

const ExplorerMoveSchema = z.object({
  uci: z.string(),
  san: z.string(),
  white: z.number(),
  draws: z.number(),
  black: z.number(),
  // The opening the move reaches, named.
  opening: z.optional(z.nullable(OpeningSchema)),
});

/** What the explorer found for a position: its games' results, and the moves played there. */
export const ExplorerDataSchema = z.object({
  white: z.number(),
  draws: z.number(),
  black: z.number(),
  moves: z.array(ExplorerMoveSchema),
  opening: z.optional(z.nullable(OpeningSchema)),
});

export type ExplorerData = z.infer<typeof ExplorerDataSchema>;

const ConfigSchema = z.object({
  // Picks the player's database, on `name`'s games ('me' for the user's).
  selectPlayer: method<[name: string]>(),
  data: z.object({
    // Lichess's props: called with a value, they set it.
    db: method<[db?: ExplorerDb]>(),
    // The side the player's games are read from, in the player's database.
    color: method<[color?: Color]>(),
    // The rating groups of Lichess's database, each from its rating to the next.
    rating: method<[ratings?: number[]]>(),
    playerName: z.object({ value: method<[]>() }),
  }),
});

export const ExplorerSchema = z.object({
  fetchMasterOpening: z.optional(method<[fen: string]>()),
  isAuth: z.optional(method<[]>()),
  enabled: z.optional(method<[]>()),
  loading: z.optional(method<[]>()),
  failing: z.optional(method<[]>()),
  current: z.optional(method<[]>()),
  // Forgets what it found, and looks the board's position up again.
  reload: z.optional(method<[]>()),
  config: z.optional(z.unknown()),
  opts: z.optional(z.unknown()),
});

export type ExplorerController = z.infer<typeof ExplorerSchema>;

export const isExplorer = createGuard(ExplorerSchema);
const isConfig = createGuard(ConfigSchema);

/** Whose games the explorer reads: one player's, as one side, in the player's database. */
export interface ExplorerSource {
  readonly db: ExplorerDb;
  readonly player: string;
  readonly color: Color;
}

const call = (member: ((...args: never[]) => unknown) | undefined, owner: object): unknown =>
  member?.call(owner);

export class Explorer {
  readonly #explorer: ExplorerController;

  constructor(explorer: ExplorerController) {
    this.#explorer = explorer;
  }

  get signedIn(): boolean {
    return Boolean(call(this.#explorer.isAuth, this.#explorer));
  }

  get enabled(): boolean {
    return Boolean(call(this.#explorer.enabled, this.#explorer));
  }

  /**
   * Still looking up the board's position. A player's games stream in while
   * Lichess indexes them, which may take minutes: what's in so far counts.
   */
  get busy(): boolean {
    return Boolean(call(this.#explorer.loading, this.#explorer));
  }

  /** The lookup failed (Lichess shows its error in the explorer's box). */
  get failing(): boolean {
    return Boolean(call(this.#explorer.failing, this.#explorer));
  }

  get source(): ExplorerSource | null {
    const { config } = this.#explorer;
    if (!isConfig(config)) return null;
    const { data } = config;
    const db = ExplorerDbSchema.safeParse(data.db());
    if (!db.success) return null;
    const player = data.playerName.value();
    return {
      db: db.data,
      player: typeof player === 'string' ? player : '',
      color: data.color() === 'black' ? 'black' : 'white',
    };
  }

  /** Reads `db`'s games from now on: the user's own as `side`, in the player's database. */
  selectBook(db: ExplorerDb, side: Color): void {
    const { config } = this.#explorer;
    if (!isConfig(config)) return;
    if (db === 'player') {
      config.selectPlayer('me');
      config.data.color(side);
    } else config.data.db(db);
    call(this.#explorer.reload, this.#explorer);
  }

  /** The rating groups Lichess's database reads, each from its rating to the next one's. */
  get ratings(): number[] {
    const { config } = this.#explorer;
    if (!isConfig(config)) return [];
    const ratings = z.array(z.number()).safeParse(config.data.rating());
    return ratings.success ? ratings.data : [];
  }

  /** Reads Lichess's players of these rating groups from now on. */
  setRatings(ratings: readonly number[]): void {
    const { config } = this.#explorer;
    if (!isConfig(config)) return;
    config.data.rating([...ratings]);
    call(this.#explorer.reload, this.#explorer);
  }

  /** Where it looks positions up, for a lookup of practice's own (`lookUp`). */
  get endpoint(): string | null {
    const opts = z.object({ endpoint: z.string() }).safeParse(this.#explorer.opts);
    return opts.success ? opts.data.endpoint : null;
  }

  /** What it found for the board's position, once it has; null while it looks, or for a tablebase's answer. */
  current(): ExplorerData | null {
    if (this.busy) return null;
    const result = ExplorerDataSchema.safeParse(call(this.#explorer.current, this.#explorer));
    return result.success ? result.data : null;
  }
}
