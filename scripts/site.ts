// Builds the promotional site (site/) into dist/site, the folder GitHub Pages
// serves (.github/workflows/pages.yml): its page, sheets and fonts as written,
// the live review (site/demo) bundled, the pictures they name
// (scripts/lib/site-assets.ts), the piece sets, the coaches' stills and the
// sidebar's pictures the review and the layout draw, and the Hugeicons the
// sheets name.
// With --serve, serves it on localhost and builds it again on every change.
//
//   node scripts/site.ts [--serve] [--port 5181]

import { watch } from 'node:fs';
import { copyFile, cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type ServerResponse } from 'node:http';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { build as bundle } from 'rolldown';
import { iconFile, NAMED_ICON } from './lib/hugeicon-files.ts';
import { fromRoot } from './lib/paths.ts';
import { namedAssets } from './lib/site-assets.ts';

const { values } = parseArgs({
  options: {
    serve: { type: 'boolean', default: false },
    port: { type: 'string', default: '5181' },
  },
});

const SOURCE = fromRoot('site');
const OUT = fromRoot('dist', 'site');

const TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.js': 'text/javascript',
  '.woff2': 'font/woff2',
};

// The folders the live review draws from by names it builds: copied whole.
const DRAWN = ['img/pieces', 'img/coaches', 'img/sidebar'];

/** The live review, its mascot (Three.js) a chunk of its own, loaded once the page is up. */
async function bundleDemo(): Promise<void> {
  await bundle({
    input: path.join(SOURCE, 'demo', 'main.ts'),
    platform: 'browser',
    logLevel: 'warn',
    // #shared/build-mode.ts: a release build's constants.
    transform: {
      define: { LN_EXT_DEV_BUILD: 'false', LN_EXT_PREVIEW: '""', LN_EXT_PREVIEW_LINKS: '[]' },
    },
    output: {
      dir: OUT,
      format: 'es',
      entryFileNames: 'demo.js',
      chunkFileNames: 'demo-[name]-[hash].js',
      minify: true,
    },
  });
}

async function build(): Promise<void> {
  await rm(OUT, { recursive: true, force: true });
  // The live review's modules are bundled, not copied.
  const modules = path.join(SOURCE, 'demo');
  await cp(SOURCE, OUT, {
    recursive: true,
    filter: file => path.relative(modules, file).startsWith('..'),
  });
  await bundleDemo();
  for (const folder of DRAWN)
    await cp(fromRoot('public', folder), path.join(OUT, folder), { recursive: true });
  const files = await readdir(SOURCE, { recursive: true });
  const texts = await Promise.all(
    files
      .filter(file => /\.(?:html|css|ts)$/.test(file))
      .map(file => readFile(path.join(SOURCE, file), 'utf8')),
  );
  const text = texts.join('\n');
  for (const [name, source] of namedAssets(text)) {
    await mkdir(path.dirname(path.join(OUT, name)), { recursive: true });
    await copyFile(fromRoot(source), path.join(OUT, name));
  }
  const icons = new Set([...text.matchAll(NAMED_ICON)].map(([, name]) => name ?? ''));
  await mkdir(path.join(OUT, 'img', 'hugeicons'), { recursive: true });
  for (const name of icons)
    await writeFile(path.join(OUT, 'img', 'hugeicons', `${name}.svg`), await iconFile(name));
  console.log(`Built the site into dist/site.`);
}

async function respond(pathname: string, response: ServerResponse): Promise<void> {
  const file = path.join(OUT, pathname.endsWith('/') ? `${pathname}index.html` : pathname);
  if (!file.startsWith(OUT)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
    response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }).end(body);
  } catch {
    response.writeHead(404).end();
  }
}

function serve(port: number): void {
  const server = createServer((request, response) => {
    void respond(new URL(request.url ?? '/', 'http://localhost').pathname, response);
  });
  server.listen(port, '127.0.0.1', () => console.log(`The site: http://localhost:${port}/`));
}

await build();
if (values.serve) {
  // An editor's save fires a few events: build once they've settled, one build at a time.
  let timer: NodeJS.Timeout | undefined;
  let building = Promise.resolve();
  watch(SOURCE, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      building = building.then(build).catch((error: unknown) => console.error(error));
    }, 100);
  });
  serve(Number(values.port));
}
