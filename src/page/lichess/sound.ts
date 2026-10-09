import { z } from 'zod/mini';
import { createGuard } from '#shared/guards.ts';
import { readSite } from './globals.ts';
import { method } from './method.ts';
import { lenient } from '#shared/zod.ts';

// Lichess's sound player, `site.sound` (ui/lib/src/sound.ts). Lichess calls
// it from untyped code, so what it passes is unknown until read.

const SoundPlayerSchema = z.object({
  paths: z.instanceof(Map),
  play: method<[name: unknown, volume?: unknown]>(),
  move: method<[options?: unknown]>(),
  // Speaks a move, if the user turned speech on; called on every jump.
  saySan: z.optional(method<[san?: unknown, cut?: unknown, force?: unknown]>()),
  theme: z.optional(z.unknown()),
  // Set once our hooks are in, so another copy of the page script leaves them be.
  lrExtHooked: z.optional(z.boolean()),
});

export type SoundPlayer = z.infer<typeof SoundPlayerSchema>;
export type PlaySound = SoundPlayer['play'];

const isSoundPlayer = createGuard(SoundPlayerSchema);
const hasSound = createGuard(z.object({ sound: z.unknown() }));

/** The page's sound player, once Lichess has set it up. */
export function soundPlayer(): SoundPlayer | null {
  const site = readSite();
  if (!hasSound(site)) return null;
  const { sound } = site;
  return isSoundPlayer(sound) ? sound : null;
}

// What `move()` is called with: a move from the server (with its SAN), an
// analysis node, or a named sound.
// A field of another type counts as missing.
const MoveOptionsSchema = z.object({
  san: lenient(z.string()),
  ply: lenient(z.number()),
  name: lenient(z.string()),
  filter: lenient(z.string()),
  volume: lenient(z.number()),
});

export type MoveOptions = z.infer<typeof MoveOptionsSchema>;

export function readMoveOptions(options: unknown): MoveOptions {
  const result = MoveOptionsSchema.safeParse(options);
  return result.success ? result.data : {};
}
