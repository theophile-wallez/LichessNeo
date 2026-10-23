// Builds the extension into dist/<target>, ready to load unpacked or to zip.
//
//   node scripts/build.ts [--target chrome|chrome-store|firefox|all] [--release]
//                         [--version x.y.z] [--out dir] [--watch]
//                         [--preview name [--preview-url url]]
//
// A --release build without --version counts the commits: it needs a full clone.
// --preview names on the page what a dev build shows, linked to --preview-url
// (pnpm preview passes both).

import { watch } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { buildTarget, TARGETS } from './lib/build-target.ts';
import { fromRoot } from './lib/paths.ts';
import { currentVersion, releaseVersion } from './lib/version.ts';

const { values } = parseArgs({
  options: {
    target: { type: 'string', default: 'chrome' },
    out: { type: 'string' },
    preview: { type: 'string' },
    'preview-url': { type: 'string' },
    version: { type: 'string' },
    release: { type: 'boolean', default: false },
    watch: { type: 'boolean', default: false },
  },
});

const targets =
  values.target === 'all' ? TARGETS : TARGETS.filter(target => target === values.target);
if (targets.length === 0) throw new Error(`unknown target: ${values.target}`);
if (values.out !== undefined && targets.length > 1)
  throw new Error('--out needs a single --target');
if ((values.preview !== undefined || values['preview-url'] !== undefined) && values.release)
  throw new Error('--preview is for dev builds: a release names nothing');
if (values['preview-url'] !== undefined && values.preview === undefined)
  throw new Error('--preview-url needs a --preview to link');
const preview =
  values.preview === undefined ? undefined : { name: values.preview, url: values['preview-url'] };

async function buildAll(): Promise<void> {
  // A dev build may guess its version; a release build must count every commit.
  const version = values.version ?? (values.release ? releaseVersion() : currentVersion());
  const started = performance.now();
  for (const target of targets) {
    const out = values.out === undefined ? fromRoot('dist', target) : path.resolve(values.out);
    await buildTarget({ target, out, version, release: values.release, preview });
  }
  console.log(
    `Built ${targets.join(', ')} ${version} in ${Math.round(performance.now() - started)} ms`,
  );
}

function watchSources(): void {
  let timer: NodeJS.Timeout | undefined;
  let queue = Promise.resolve();
  const rebuild = (): void => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      queue = queue.then(buildAll).catch((error: unknown) => console.error(error));
    }, 100);
  };
  for (const dir of ['src', 'public']) watch(fromRoot(dir), { recursive: true }, rebuild);
  console.log('Watching src/ and public/ for changes…');
}

await buildAll();
if (values.watch) watchSources();
