// Turns at what the worktrees share: the preview Chrome loads from the main
// checkout's dist/chrome, and shipping to main. A turn is held by a claim, a
// file in the repository's common git folder, which every worktree sees.

import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod/mini';
import { parseJson } from '#shared/json.ts';

export const TURNS = ['preview', 'ship'] as const;
export type Turn = (typeof TURNS)[number];

const ClaimSchema = z.object({
  worktree: z.string(),
  branch: z.string(),
  thread: z.optional(z.string()),
  // What a preview shows, as its badge names it.
  name: z.optional(z.string()),
  since: z.number(),
});

export type Claim = z.infer<typeof ClaimSchema>;

/** Who asks for a turn, and where the main checkout is. */
export interface Claimant {
  worktree: string;
  branch: string;
  thread?: string | undefined;
  name?: string | undefined;
  mainCheckout: string;
}

export type Outcome = { taken: true; previous: Claim | null } | { taken: false; holder: Claim };

// A ship takes minutes: a claim this old was cut short.
const SHIP_STALE_MS = 60 * 60 * 1000;

const claimFile = (dir: string, turn: Turn): string => path.join(dir, `${turn}.json`);

export function readClaim(dir: string, turn: Turn): Claim | null {
  try {
    return parseJson(readFileSync(claimFile(dir, turn), 'utf8'), ClaimSchema);
  } catch {
    return null;
  }
}

/** Whether `claimant` may take the turn without asking its holder. */
export function isFree(turn: Turn, claim: Claim | null, claimant: Claimant, now: number): boolean {
  if (claim === null || claim.worktree === claimant.worktree) return true;
  // A removed worktree has no session left to ask.
  if (!existsSync(claim.worktree)) return true;
  // The main checkout's build is what was shipped, nobody's draft.
  if (turn === 'preview') return claim.worktree === claimant.mainCheckout;
  return now - claim.since > SHIP_STALE_MS;
}

/** Takes the turn if it's free, or `force`d: the previous holder must then be told. */
export function takeTurn(
  dir: string,
  turn: Turn,
  claimant: Claimant,
  { force = false, now = Date.now() } = {},
): Outcome {
  mkdirSync(dir, { recursive: true });
  const file = claimFile(dir, turn);
  const { worktree, branch, thread, name } = claimant;
  const text = JSON.stringify({ worktree, branch, thread, name, since: now });
  // Retried while another worktree swaps the file between our read and write.
  for (let attempt = 0; attempt < 5; attempt++) {
    const previous = readClaim(dir, turn);
    if (!force && previous !== null && !isFree(turn, previous, claimant, now)) {
      return { taken: false, holder: previous };
    }
    // Moved aside first, so that of two takers only one gets past the rename.
    if (existsSync(file) && !moveAside(file)) continue;
    try {
      writeFileSync(file, text, { flag: 'wx' });
      return { taken: true, previous };
    } catch (error) {
      if (!isCode(error, 'EEXIST')) throw error;
    }
  }
  throw new Error(`couldn't claim the ${turn} turn: other worktrees keep taking it`);
}

/** Gives the turn back, if `worktree` holds it. */
export function releaseTurn(dir: string, turn: Turn, worktree: string): boolean {
  if (readClaim(dir, turn)?.worktree !== worktree) return false;
  rmSync(claimFile(dir, turn), { force: true });
  return true;
}

function moveAside(file: string): boolean {
  const aside = `${file}.${process.pid}.${Date.now()}`;
  try {
    renameSync(file, aside);
  } catch (error) {
    if (isCode(error, 'ENOENT')) return false;
    throw error;
  }
  rmSync(aside, { force: true });
  return true;
}

const isCode = (error: unknown, code: string): boolean =>
  error instanceof Error && 'code' in error && error.code === code;

/** One line on who holds a turn, for the scripts' output. */
export function describeClaim(claim: Claim, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - claim.since) / 60_000));
  const thread = claim.thread === undefined ? '' : `, T3 thread ${claim.thread}`;
  const name = claim.name === undefined ? '' : `"${claim.name}", `;
  return `${name}${claim.branch} (${claim.worktree}${thread}), ${minutes} min ago`;
}
