import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BASE_VERSION } from '#manifest';
import { tempDirs } from './testing.ts';
import { currentVersion, releaseVersion } from './version.ts';

const newDir = tempDirs('ln-ext-version-');

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
  execFileSync('git', args, { cwd, env: GIT_ENV });
}

async function repository(commits: number): Promise<string> {
  const dir = await newDir();
  git(dir, 'init', '-q', '-b', 'main');
  for (let i = 1; i <= commits; i++) git(dir, 'commit', '-q', '--allow-empty', '-m', `${i}`);
  return dir;
}

/** Commits a manifest whose BASE_VERSION is `base`, as src/manifest.ts holds it. */
async function commitBase(repo: string, base: string): Promise<void> {
  await mkdir(path.join(repo, 'src'), { recursive: true });
  await writeFile(
    path.join(repo, 'src/manifest.ts'),
    `// The manifest.\nexport const BASE_VERSION = '${base}';\nexport const OTHER = 1;\n`,
  );
  git(repo, 'add', 'src/manifest.ts');
  git(repo, 'commit', '-q', '-m', `base ${base}`);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('the version', () => {
  it('counts every commit of a full clone', async () => {
    const repo = await repository(3);
    expect(releaseVersion(repo)).toBe(`${BASE_VERSION}.3`);
    expect(currentVersion(repo)).toBe(`${BASE_VERSION}.3`);
  });

  it('counts from the commit that last changed BASE_VERSION, which is .0', async () => {
    const repo = await repository(2);
    await commitBase(repo, '0.1');
    git(repo, 'commit', '-q', '--allow-empty', '-m', 'work');
    await commitBase(repo, '0.2');
    expect(releaseVersion(repo)).toBe('0.2.0');
    git(repo, 'commit', '-q', '--allow-empty', '-m', 'more work');
    git(repo, 'commit', '-q', '--allow-empty', '-m', 'and more');
    expect(releaseVersion(repo)).toBe('0.2.2');
    expect(currentVersion(repo)).toBe('0.2.2');
    // An earlier commit gets the version it had then.
    expect(releaseVersion(repo, 'HEAD~3')).toBe('0.1.1');
  });

  it('keeps counting when the manifest changes elsewhere than BASE_VERSION', async () => {
    const repo = await repository(1);
    await commitBase(repo, '0.2');
    await writeFile(
      path.join(repo, 'src/manifest.ts'),
      "export const BASE_VERSION = '0.2';\nexport const OTHER = 2;\n",
    );
    git(repo, 'commit', '-q', '-am', 'other change');
    expect(releaseVersion(repo)).toBe('0.2.1');
  });

  it('is refused for a release from a shallow clone, which a dev build takes as is', async () => {
    const repo = await repository(3);
    const clone = path.join(await newDir(), 'clone');
    git(repo, 'clone', '-q', '--depth', '1', `file://${repo}`, clone);
    expect(() => releaseVersion(clone)).toThrow(/shallow clone/);
    expect(currentVersion(clone)).toBe(`${BASE_VERSION}.1`);
  });

  it('is refused for a release without git, where a dev build gets .0', async () => {
    const dir = await newDir();
    // Or git would find a repository above the temporary folder.
    vi.stubEnv('GIT_CEILING_DIRECTORIES', path.dirname(dir));
    expect(() => releaseVersion(dir)).toThrow(/no git history/);
    expect(currentVersion(dir)).toBe(`${BASE_VERSION}.0`);
  });
});
