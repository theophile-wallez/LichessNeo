import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  type Claim,
  type Claimant,
  describeClaim,
  isFree,
  readClaim,
  releaseTurn,
  takeTurn,
} from './claims.ts';
import { tempDirs } from './testing.ts';

const newDir = tempDirs('ln-ext-turns-');
const HOUR = 60 * 60 * 1000;

/** A folder of turns, the main checkout and two worktrees that exist on disk. */
async function repository(): Promise<{ dir: string; main: Claimant; a: Claimant; b: Claimant }> {
  const root = await newDir();
  const claimant = async (name: string): Promise<Claimant> => {
    const worktree = path.join(root, name);
    await mkdir(worktree);
    return { worktree, branch: `t3/${name}`, mainCheckout: path.join(root, 'main') };
  };
  const main = await claimant('main');
  return { dir: path.join(root, 'turns'), main, a: await claimant('a'), b: await claimant('b') };
}

describe('takeTurn', () => {
  it('takes a free turn and notes who holds it', async () => {
    const { dir, a } = await repository();
    const outcome = takeTurn(dir, 'ship', { ...a, thread: 'thread-a' }, { now: 1000 });
    expect(outcome).toEqual({ taken: true, previous: null });
    expect(readClaim(dir, 'ship')).toEqual({
      worktree: a.worktree,
      branch: 't3/a',
      thread: 'thread-a',
      since: 1000,
    });
  });

  it('notes what a preview shows', async () => {
    const { dir, a } = await repository();
    takeTurn(dir, 'preview', { ...a, name: 'Eval bar' }, { now: 1000 });
    const claim = readClaim(dir, 'preview');
    expect(claim?.name).toBe('Eval bar');
    expect(claim === null ? '' : describeClaim(claim, 1000)).toMatch(/^"Eval bar", t3\/a /);
  });

  it("refuses another worktree's turn, and names its holder", async () => {
    const { dir, a, b } = await repository();
    takeTurn(dir, 'ship', a, { now: 1000 });
    const outcome = takeTurn(dir, 'ship', b, { now: 2000 });
    expect(outcome.taken ? null : outcome.holder.branch).toBe('t3/a');
    expect(readClaim(dir, 'ship')?.branch).toBe('t3/a');
  });

  it('gives the turn back to the worktree that holds it', async () => {
    const { dir, a } = await repository();
    takeTurn(dir, 'preview', a, { now: 1000 });
    const outcome = takeTurn(dir, 'preview', a, { now: 2000 });
    expect(outcome.taken).toBe(true);
    expect(readClaim(dir, 'preview')?.since).toBe(2000);
  });

  it('takes a held turn when forced, and returns its previous holder', async () => {
    const { dir, a, b } = await repository();
    takeTurn(dir, 'preview', a, { now: 1000 });
    const outcome = takeTurn(dir, 'preview', b, { force: true, now: 2000 });
    expect(outcome.taken ? outcome.previous?.branch : null).toBe('t3/a');
    expect(readClaim(dir, 'preview')?.branch).toBe('t3/b');
    expect(await readdir(dir)).toEqual(['preview.json']);
  });

  it('takes over a claim it cannot read', async () => {
    const { dir, a } = await repository();
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'ship.json'), '{"worktree":');
    expect(takeTurn(dir, 'ship', a).taken).toBe(true);
  });
});

const claimOf = (claimant: Claimant, since = 0): Claim => ({ ...claimant, since });

describe('isFree', () => {
  it("holds another live worktree's preview for as long as Chrome shows it", async () => {
    const { a, b } = await repository();
    expect(isFree('preview', claimOf(a), b, 10 * HOUR)).toBe(false);
  });

  it("frees the preview of the main checkout's build, and of a removed worktree", async () => {
    const { main, b } = await repository();
    expect(isFree('preview', claimOf(main), b, 0)).toBe(true);
    const removed = { ...main, worktree: path.join(main.worktree, 'gone') };
    expect(isFree('preview', claimOf(removed), b, 0)).toBe(true);
  });

  it('frees a ship cut short an hour ago, not one under way', async () => {
    const { a, b } = await repository();
    expect(isFree('ship', claimOf(a), b, HOUR / 2)).toBe(false);
    expect(isFree('ship', claimOf(a), b, 2 * HOUR)).toBe(true);
  });
});

describe('releaseTurn', () => {
  it('releases only the turn this worktree holds', async () => {
    const { dir, a, b } = await repository();
    takeTurn(dir, 'ship', a);
    expect(releaseTurn(dir, 'ship', b.worktree)).toBe(false);
    expect(readClaim(dir, 'ship')?.branch).toBe('t3/a');
    expect(releaseTurn(dir, 'ship', a.worktree)).toBe(true);
    expect(readClaim(dir, 'ship')).toBeNull();
  });
});
