// Writes public/img/hugeicons from @hugeicons/core-free-icons: one SVG for each
// icon a stylesheet names (`img/hugeicons/arrow-left-01.svg` is the package's
// ArrowLeft01Icon), and none for the others. Run it after naming a new one:
// the build fails on a stylesheet's URL whose file is missing. An icon drawn
// as a mask takes the color of what it masks; one drawn as an image (where no
// mask can go, an input's background) has its color in its name:
// `search-01--989795.svg`, `champion--0000008c.svg` with its alpha.

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { iconFile, NAMED_ICON } from './lib/hugeicon-files.ts';
import { fromRoot } from './lib/paths.ts';

const STYLES = fromRoot('src/styles');
const OUT = fromRoot('public/img/hugeicons');

async function namedIcons(): Promise<Set<string>> {
  const files = await readdir(STYLES, { recursive: true });
  const names = new Set<string>();
  for (const file of files.filter(name => name.endsWith('.css'))) {
    const text = await readFile(path.join(STYLES, file), 'utf8');
    for (const [, name] of text.matchAll(NAMED_ICON)) if (name) names.add(name);
  }
  return names;
}

const names = await namedIcons();
await mkdir(OUT, { recursive: true });
for (const file of await readdir(OUT))
  if (!names.has(file.replace(/\.svg$/, ''))) await rm(path.join(OUT, file));
for (const name of [...names].toSorted())
  await writeFile(path.join(OUT, `${name}.svg`), await iconFile(name));
console.log(`Wrote ${names.size} icons into public/img/hugeicons.`);
