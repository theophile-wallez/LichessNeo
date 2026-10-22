// Takes turns with the other worktrees at the preview and at shipping:
//
//   node scripts/turn.ts                     who holds each turn
//   node scripts/turn.ts take ship [--thread <T3 thread id>] [--wait]
//   node scripts/turn.ts release ship
//
// The preview's turn is taken by pnpm preview itself.

import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { describeClaim, readClaim, releaseTurn, takeTurn, TURNS, type Turn } from './lib/claims.ts';
import { claimantHere, turnsDir } from './lib/worktree.ts';

const WAIT_STEP_MS = 5000;
const WAIT_LIMIT_MS = 30 * 60 * 1000;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { thread: { type: 'string' }, wait: { type: 'boolean', default: false } },
});

const [action = 'status', name] = positionals;
const dir = turnsDir();

function turnNamed(value: string | undefined): Turn {
  const turn = TURNS.find(candidate => candidate === value);
  if (turn === undefined) throw new Error(`name a turn: ${TURNS.join(' or ')}`);
  return turn;
}

async function take(turn: Turn): Promise<void> {
  const claimant = claimantHere(values.thread);
  const started = Date.now();
  let outcome = takeTurn(dir, turn, claimant);
  while (!outcome.taken && values.wait && Date.now() - started < WAIT_LIMIT_MS) {
    await sleep(WAIT_STEP_MS);
    outcome = takeTurn(dir, turn, claimant);
  }
  if (!outcome.taken) {
    console.error(`The ${turn} turn is held by ${describeClaim(outcome.holder)}.`);
    process.exit(1);
  }
  console.log(`${claimant.branch} holds the ${turn} turn.`);
}

if (action === 'status') {
  for (const turn of TURNS) {
    const claim = readClaim(dir, turn);
    console.log(`${turn}: ${claim === null ? 'free' : describeClaim(claim)}`);
  }
} else if (action === 'take') {
  await take(turnNamed(name));
} else if (action === 'release') {
  const turn = turnNamed(name);
  const released = releaseTurn(dir, turn, claimantHere(undefined).worktree);
  console.log(
    released ? `Released the ${turn} turn.` : `This worktree didn't hold the ${turn} turn.`,
  );
} else {
  throw new Error(`unknown action: ${action} (status, take or release)`);
}
