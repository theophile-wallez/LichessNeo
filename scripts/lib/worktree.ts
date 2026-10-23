// Where this worktree, the main checkout and the folder of turns are.

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import type { Claimant } from './claims.ts';

const gitIn = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const git = (...args: string[]): string => gitIn(process.cwd(), ...args);

/** How many commits of origin/main the checkout at `cwd` lacks, once fetched. */
export function commitsBehindMain(cwd = process.cwd()): number {
  try {
    gitIn(cwd, 'fetch', '--quiet', 'origin', 'main');
  } catch {
    // Offline: as of the last fetch.
  }
  return Number(gitIn(cwd, 'rev-list', '--count', 'HEAD..origin/main'));
}

/** The folder of turns, in the git folder every worktree shares. */
export const turnsDir = (): string =>
  path.join(git('rev-parse', '--path-format=absolute', '--git-common-dir'), 'ln-ext-turns');

/** The main checkout: git lists it first. */
export const mainCheckout = (): string =>
  git('worktree', 'list', '--porcelain')
    .split('\n')[0]
    ?.replace(/^worktree /, '') ?? '';

export function claimantHere(thread: string | undefined): Claimant {
  return {
    worktree: git('rev-parse', '--show-toplevel'),
    branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
    thread,
    mainCheckout: mainCheckout(),
  };
}
