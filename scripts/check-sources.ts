// Checks every source file, the root's config files included, against the
// rules the linters can't express (scripts/lib/source-rules.ts).

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fromRoot, ROOT } from './lib/paths.ts';
import { findProblems, isChecked } from './lib/source-rules.ts';

const DIRS = ['src', 'scripts', 'tests', 'playground'];

async function filesBelow(dir: string): Promise<string[]> {
  const entries = await readdir(fromRoot(dir), { recursive: true, withFileTypes: true });
  return entries
    .filter(entry => entry.isFile())
    .map(entry => path.relative(ROOT, path.join(entry.parentPath, entry.name)));
}

// vitest.config.ts, playwright.config.ts: the root's own files, not its folders.
async function rootFiles(): Promise<string[]> {
  const entries = await readdir(ROOT, { withFileTypes: true });
  return entries.filter(entry => entry.isFile()).map(entry => entry.name);
}

const files = [await rootFiles(), ...(await Promise.all(DIRS.map(filesBelow)))].flat();
const checked = files.filter(isChecked);
const problems: string[] = [];
for (const file of checked) {
  const text = await readFile(fromRoot(file), 'utf8');
  for (const problem of findProblems(file, text)) problems.push(`${file} ${problem}`);
}

if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  process.exit(1);
}
console.log(`Sources check out: ${checked.length} files.`);
