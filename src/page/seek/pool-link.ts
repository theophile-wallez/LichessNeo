import { z } from 'zod/mini';

// What a game's "New opponent" asks for: its link is /#pool/<id>[/<opponent>]
// (lila's ui/round/src/view/button.ts), the opponent's id so the pool doesn't
// pair the same two players again.

const POOL_LINK = /#pool\/(\d+\+\d+)(?:\/([\w-]+))?$/;

/** What the lobby's socket takes to seek in a pool (lila's ui/lobby/src/interfaces.ts). */
const PoolMemberSchema = z.object({
  id: z.string(),
  range: z.optional(z.string()),
  blocking: z.optional(z.string()),
});

export type PoolMember = z.infer<typeof PoolMemberSchema>;

/** The pool a "New opponent" link seeks in, and the player it avoids; null for another link. */
export function poolOfLink(href: string): PoolMember | null {
  const match = POOL_LINK.exec(href);
  const id = match?.[1];
  if (!id) return null;
  const blocking = match[2];
  return blocking === undefined ? { id } : { id, blocking };
}

/** Where the lobby keeps a player's rating range for a pool (lila's lib/poolRangeStorage.ts). */
export const rangeKey = (username: string, pool: string): string =>
  `lobby-pool-range.${username}.${pool}`;

/** How long the seek has run, as a clock writes it: "0:07", "1:23". */
export function waited(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
