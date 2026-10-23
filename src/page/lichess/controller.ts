import { z } from 'zod/mini';
import { createGuard } from '#shared/guards.ts';
import { lenient } from '#shared/zod.ts';
import { method } from './method.ts';

// The shape of Lichess's analysis controller (ui/analyse/src/ctrl.ts), as
// far as the extension uses it. Its methods are checked once; the members
// Lichess reassigns as the user moves (node, path…) stay unknown here and
// are narrowed on every read (see analysis.ts).

const TreeSchema = z.object({ nodeAtPath: method<[path: string]>() });

const ControllerSchema = z.object({
  data: z.unknown(),
  tree: TreeSchema,
  node: z.unknown(),
  path: z.unknown(),
  nodeList: z.unknown(),
  mainline: z.unknown(),
  onMainline: z.unknown(),
  jumpToMain: method<[ply: number]>(),
  userJump: method<[path: string]>(),
  getOrientation: method<[]>(),
  playUci: z.optional(z.unknown()),
  redraw: z.optional(z.unknown()),
  synthetic: z.optional(z.unknown()),
  actionMenu: z.optional(z.unknown()),
  practice: z.optional(z.unknown()),
  togglePractice: z.optional(z.unknown()),
  retro: z.optional(z.unknown()),
  toggleRetro: z.optional(z.unknown()),
  hasFullComputerAnalysis: z.optional(z.unknown()),
  explorer: z.optional(z.unknown()),
  toggleExplorer: z.optional(z.unknown()),
  flip: z.optional(z.unknown()),
  changePgn: z.optional(z.unknown()),
});

export type Controller = z.infer<typeof ControllerSchema>;

export const isController = createGuard(ControllerSchema);

const PlayerSchema = z.object({
  color: z.enum(['white', 'black']),
  user: lenient(z.object({ username: lenient(z.string()) })),
  name: lenient(z.string()),
  // The computer's level, on a game against it.
  ai: lenient(z.number()),
  rating: lenient(z.number()),
});

export type Player = z.infer<typeof PlayerSchema>;

/** `ctrl.data`: plain data, parsed once rather than narrowed. */
export const GameDataSchema = z.object({
  game: z.object({
    // `synthetic` on the free analysis board.
    id: z.string(),
    speed: lenient(z.string()),
    variant: z.object({ key: z.string() }),
    // Set once a game is won; none for a draw or a game going on.
    winner: lenient(z.enum(['white', 'black'])),
    // How it ended, as lila's chess.Status names it ("mate", "resign"…).
    status: lenient(z.object({ name: z.string() })),
  }),
  player: PlayerSchema,
  opponent: PlayerSchema,
});

export type GameData = z.infer<typeof GameDataSchema>;

/** What `ctrl.data` tells of a game's course: its move times and its phases, by ply. */
export const GameCourseSchema = z.object({
  game: z.object({
    // Each move's time, in centiseconds; none for an imported game.
    moveCentis: lenient(z.array(z.number())),
    division: lenient(z.object({ middle: lenient(z.number()), end: lenient(z.number()) })),
  }),
  // The time control, in seconds; none for correspondence or an imported game.
  clock: lenient(z.object({ increment: z.number() })),
});

export type GameCourse = z.infer<typeof GameCourseSchema>;

/** What the opening explorer's masters database says of a position. */
export const MasterOpeningSchema = z.object({
  white: z.number(),
  draws: z.number(),
  black: z.number(),
  opening: z.optional(
    z.nullable(z.object({ name: z.optional(z.string()), eco: z.optional(z.string()) })),
  ),
});

export type MasterOpening = z.infer<typeof MasterOpeningSchema>;
