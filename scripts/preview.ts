// Builds this worktree into the main checkout's dist/chrome, the copy Chrome
// loads, and notes that Chrome shows it now:
//
//   node scripts/preview.ts [--thread <T3 thread id>] [--take]
//
// It never replaces another worktree's draft unasked: it names that worktree
// and stops, for its session to be told first, then --take replaces it. Nor
// does it build a worktree behind origin/main, which would undo in Chrome what
// other sessions shipped.

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { describeClaim, isFree, readClaim, takeTurn } from './lib/claims.ts';
import { fromRoot } from './lib/paths.ts';
import { claimantHere, commitsBehindMain, turnsDir } from './lib/worktree.ts';

const { values } = parseArgs({
  options: { thread: { type: 'string' }, take: { type: 'boolean', default: false } },
});

const behind = commitsBehindMain();
if (behind > 0) {
  console.error(`origin/main has ${behind} commits this worktree lacks: other sessions shipped.`);
  console.error('Rebase onto it first: git rebase --autostash origin/main.');
  process.exit(1);
}

const dir = turnsDir();
const claimant = claimantHere(values.thread);
const shown = readClaim(dir, 'preview');

if (shown !== null && !values.take && !isFree('preview', shown, claimant, Date.now())) {
  console.error(`Chrome shows another draft: ${describeClaim(shown)}.`);
  console.error('Tell that session its preview is being replaced, then run pnpm preview --take.');
  process.exit(1);
}

execFileSync(
  process.execPath,
  [fromRoot('scripts/build.ts'), '--out', path.join(claimant.mainCheckout, 'dist', 'chrome')],
  { stdio: 'inherit' },
);

const outcome = takeTurn(dir, 'preview', claimant, { force: true });
const previous = outcome.taken ? outcome.previous : null;
console.log(`Chrome shows ${claimant.branch} now, once a Lichess tab gets focus.`);
if (previous !== null && previous.worktree !== claimant.worktree) {
  console.log(`It replaced ${describeClaim(previous)}.`);
}
