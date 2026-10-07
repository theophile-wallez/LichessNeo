// Writes public/img/hugeicons from @hugeicons/core-free-icons: one SVG for each
// icon a stylesheet names (`img/hugeicons/arrow-left-01.svg` is the package's
// ArrowLeft01Icon), and none for the others. Run it after naming a new one:
// the build fails on a stylesheet's URL whose file is missing. An icon drawn
// as a mask takes the color of what it masks; one drawn as an image (where no
// mask can go, an input's background) has its color in its name:
// `search-01--989795.svg`, `champion--0000008c.svg` with its alpha.

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod/mini';
import { hugeiconMarkup, type HugeIcon } from '#shared/hugeicons-svg.ts';
import { fromRoot } from './lib/paths.ts';

const STYLES = fromRoot('src/styles');
const OUT = fromRoot('public/img/hugeicons');
const NAMED = /img\/hugeicons\/([a-z0-9-]+)\.svg/g;
const COLORED = /^(.+)--([0-9a-f]{6}(?:[0-9a-f]{2})?)$/;

async function namedIcons(): Promise<Set<string>> {
  const files = await readdir(STYLES, { recursive: true });
  const names = new Set<string>();
  for (const file of files.filter(name => name.endsWith('.css'))) {
    const text = await readFile(path.join(STYLES, file), 'utf8');
    for (const [, name] of text.matchAll(NAMED)) if (name) names.add(name);
  }
  return names;
}

/** `arrow-left-01` → `ArrowLeft01Icon`, the package's own export. */
const exportName = (name: string): string =>
  `${name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}Icon`;

// Each module's default export: the icon's elements and their attributes.
const IconModuleSchema = z.object({
  default: z.array(z.tuple([z.string(), z.record(z.string(), z.union([z.string(), z.number()]))])),
});

async function loadIcon(name: string): Promise<HugeIcon> {
  const module: unknown = await import(`@hugeicons/core-free-icons/${exportName(name)}`);
  return IconModuleSchema.parse(module).default;
}

const names = await namedIcons();
await mkdir(OUT, { recursive: true });
for (const file of await readdir(OUT))
  if (!names.has(file.replace(/\.svg$/, ''))) await rm(path.join(OUT, file));
for (const name of [...names].toSorted()) {
  const [, icon = name, color] = COLORED.exec(name) ?? [];
  let markup = hugeiconMarkup(await loadIcon(icon));
  if (color) markup = markup.replaceAll('currentColor', `#${color}`);
  await writeFile(path.join(OUT, `${name}.svg`), `${markup}\n`);
}
console.log(`Wrote ${names.size} icons into public/img/hugeicons.`);
