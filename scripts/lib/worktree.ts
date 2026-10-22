// Where this worktree, the main checkout and the folder of turns are.

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import type { Claimant } from './claims.ts';

const git = (...args: string[]): string =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

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
