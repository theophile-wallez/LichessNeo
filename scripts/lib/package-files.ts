import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import type { Target } from '#manifest';
import { ROOT } from './paths.ts';
import { comparePaths } from './zip.ts';

/** What each zip holds: a build of one target, or the sources it's built from. */
export type PackageKind = Target | 'source';

const SUFFIXES: Record<PackageKind, string> = {
  chrome: '',
  'chrome-store': '-store',
  firefox: '-firefox',
  source: '-source',
};

// The names every release has had: the README's install steps point to them.
export function packageName(kind: PackageKind, version: string): string {
  return `LichessReimagined-v${version}${SUFFIXES[kind]}.zip`;
}

export function isPackageName(name: string): boolean {
  return /^LichessReimagined-v\d[\w.-]*\.zip$/.test(name);
}

// Source maps are for local debugging only, and the rest are files the OS leaves behind.
const LEFT_OUT = [/\.map$/, /(^|\/)\.DS_Store$/, /(^|\/)Thumbs\.db$/];

export function isPackaged(file: string): boolean {
  return !LEFT_OUT.some(pattern => pattern.test(file));
}

function toZipPath(relative: string): string {
  return relative.split(path.sep).join('/');
}

/** The files under `dir` that go in its zip, sorted, relative to it. */
export async function listPackageFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter(entry => entry.isFile())
    .map(entry => toZipPath(path.relative(dir, path.join(entry.parentPath, entry.name))))
    .filter(isPackaged)
    .toSorted(comparePaths);
}

/** The files of a `git ls-files -z` listing that go in the source zip, sorted. */
export function selectSourceFiles(listing: string, exists: (file: string) => boolean): string[] {
  const files = new Set(listing.split('\0').filter(file => file !== ''));
  // A file deleted but not yet committed is still listed.
  return [...files].filter(file => isPackaged(file) && exists(file)).toSorted(comparePaths);
}

/**
 * The repository's files, relative to its root: what git tracks, plus what it
 * would (not ignored), so a local build's sources match it too. A CI checkout
 * has only the tracked ones.
 */
export function listSourceFiles(): string[] {
  const listing = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  return selectSourceFiles(listing, file => existsSync(path.join(ROOT, file)));
}
