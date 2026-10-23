import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDirs } from './testing.ts';
import { commitsBehindMain } from './worktree.ts';

const newDir = tempDirs('ln-ext-worktree-');

// The fixtures' git leaves the user's config (signing, hooks) out.
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};

function git(cwd: string, ...args: string[]): void {
  execFileSync('git', args, { cwd, env: GIT_ENV, stdio: 'ignore' });
}

/** An origin with one commit on main, and a clone of it. */
async function cloned(): Promise<{ origin: string; clone: string }> {
  const root = await newDir();
  const origin = path.join(root, 'origin');
  const clone = path.join(root, 'clone');
  git(root, 'init', '-q', '-b', 'main', origin);
  git(origin, 'commit', '-q', '--allow-empty', '-m', 'first');
  git(root, 'clone', '-q', origin, clone);
  return { origin, clone };
}

describe('commitsBehindMain', () => {
  it('counts the commits shipped to origin/main since, fetching them first', async () => {
    const { origin, clone } = await cloned();
    expect(commitsBehindMain(clone)).toBe(0);
    git(origin, 'commit', '-q', '--allow-empty', '-m', 'shipped by another session');
    git(origin, 'commit', '-q', '--allow-empty', '-m', 'and another');
    expect(commitsBehindMain(clone)).toBe(2);
  });

  it("doesn't count this worktree's own commits", async () => {
    const { clone } = await cloned();
    git(clone, 'commit', '-q', '--allow-empty', '-m', 'draft');
    expect(commitsBehindMain(clone)).toBe(0);
  });
});
