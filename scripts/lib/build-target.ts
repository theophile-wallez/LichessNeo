import { existsSync } from 'node:fs';
import { cp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'rolldown';
import { createManifest, ManifestSchema, OUTPUT, type Target } from '#manifest';
import { bundleCss } from './css-bundle.ts';
import { stripCss } from './css-strip.ts';
import { assertExtensionUrls } from './extension-urls.ts';
import { assertNoChromeUrls, toFirefoxCss } from './firefox.ts';
import { assertLicensed, LICENSES } from './licenses.ts';
import { fromRoot } from './paths.ts';
import { replaceDir } from './replace-dir.ts';

export const TARGETS: readonly Target[] = ['chrome', 'chrome-store', 'firefox'];

const SCRIPTS = [
  { input: 'src/background/index.ts', output: OUTPUT.background },
  { input: 'src/content/index.ts', output: OUTPUT.content },
  { input: 'src/page/index.ts', output: OUTPUT.page },
];

// The coach imports lottie's typed light player; bundle its production build.
const ALIASES = {
  'lottie-web/build/player/lottie_light': fromRoot(
    'node_modules/lottie-web/build/player/lottie_light.min.js',
  ),
};

export interface BuildOptions {
  readonly target: Target;
  readonly out: string;
  readonly version: string;
  /** Minified, without source maps or CSS comments: what the stores get. */
  readonly release: boolean;
}

/** Promise.all that waits for every task before it fails, so none is left writing. */
async function settleAll<T>(tasks: readonly Promise<T>[]): Promise<T[]> {
  const results = await Promise.allSettled(tasks);
  for (const result of results) if (result.status === 'rejected') throw result.reason;
  return results.flatMap(result => (result.status === 'fulfilled' ? [result.value] : []));
}

/** Bundles the scripts, and returns the modules bundled into them. */
async function bundleScripts({ out, release }: BuildOptions): Promise<string[]> {
  // A failed build removes its staging folder: no bundle may still be writing into it.
  const bundles = await settleAll(
    SCRIPTS.map(({ input, output }) =>
      build({
        input: fromRoot(input),
        platform: 'browser',
        logLevel: 'warn',
        resolve: { alias: ALIASES },
        // Read by #shared/build-mode.ts: only a dev build reloads itself.
        transform: { define: { CDC_DEV_BUILD: String(!release) } },
        output: {
          file: path.join(out, output),
          format: 'iife',
          sourcemap: !release,
          minify: release,
        },
      }),
    ),
  );
  return bundles.flatMap(({ output }) =>
    output.flatMap(file => (file.type === 'chunk' ? file.moduleIds : [])),
  );
}

/** Writes the stylesheet, and returns it as Chrome gets it. */
async function bundleStyles({ target, out, release }: BuildOptions): Promise<string> {
  const bundled = await bundleCss(fromRoot('src/styles/index.css'));
  const css = release ? stripCss(bundled) : bundled;
  await writeFile(path.join(out, OUTPUT.styles), target === 'firefox' ? toFirefoxCss(css) : css);
  return css;
}

async function checkFirefoxBuild(out: string): Promise<void> {
  const files = new Map<string, string>();
  for (const name of Object.values(OUTPUT)) {
    files.set(name, await readFile(path.join(out, name), 'utf8'));
  }
  assertNoChromeUrls(files);
}

async function buildInto(options: BuildOptions): Promise<void> {
  const { target, out, version } = options;
  await cp(fromRoot('public'), out, { recursive: true });
  for (const { from, to } of LICENSES) await cp(fromRoot(from), path.join(out, to));
  const moduleIds = await bundleScripts(options);
  assertLicensed(moduleIds);
  const css = await bundleStyles(options);
  const manifest = ManifestSchema.parse(createManifest(target, version));
  assertExtensionUrls(css, {
    exists: file => existsSync(path.join(out, file)),
    resources: manifest.web_accessible_resources.flatMap(entry => entry.resources),
  });
  await writeFile(path.join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  if (target === 'firefox') await checkFirefoxBuild(out);
}

/**
 * Builds one target from scratch into `out`, swapped in whole once done: a
 * failed build leaves `out` as it was.
 */
export async function buildTarget(options: BuildOptions): Promise<void> {
  await replaceDir(options.out, staging => buildInto({ ...options, out: staging }));
}
