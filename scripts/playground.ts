// Serves the mascots' playground (playground/), a page apart from the
// extension that no build of it bundles, and reloads it on every change.
//
//   node scripts/playground.ts [--port 5180]

import { watch as watchFiles } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer, type ServerResponse } from 'node:http';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { watch } from 'rolldown';
import { fromRoot } from './lib/paths.ts';

const { values } = parseArgs({ options: { port: { type: 'string', default: '5180' } } });

const OUT = fromRoot('dist', 'playground');
// What the page asks for, and where it is: the page and its sheet as written, its script as built.
const FILES: Readonly<Record<string, readonly [string, string]>> = {
  '/': [fromRoot('playground', 'index.html'), 'text/html'],
  '/style.css': [fromRoot('playground', 'style.css'), 'text/css'],
  '/main.js': [path.join(OUT, 'main.js'), 'text/javascript'],
  '/main.js.map': [path.join(OUT, 'main.js.map'), 'application/json'],
};

const listeners = new Set<ServerResponse>();

function reload(): void {
  for (const response of listeners) response.write('event: reload\ndata: \n\n');
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (url.pathname === '/events') {
    response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' });
    listeners.add(response);
    request.on('close', () => listeners.delete(response));
    return;
  }
  const file = FILES[url.pathname];
  if (!file) {
    response.writeHead(404).end();
    return;
  }
  const [location, type] = file;
  readFile(location).then(
    body =>
      response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }).end(body),
    () => response.writeHead(503).end('Not built yet'),
  );
});

const bundler = watch({
  input: fromRoot('playground', 'main.ts'),
  platform: 'browser',
  logLevel: 'warn',
  output: { file: path.join(OUT, 'main.js'), format: 'es', sourcemap: true },
});
bundler.on('event', event => {
  if (event.code === 'BUNDLE_END') {
    console.log(`Built the playground in ${Math.round(event.duration)} ms`);
    void event.result.close();
    reload();
  }
  if (event.code === 'ERROR') {
    console.error(event.error);
    void event.result.close();
  }
});
watchFiles(fromRoot('playground'), file => {
  if (file?.endsWith('.html') || file?.endsWith('.css')) reload();
});

server.listen(Number(values.port), '127.0.0.1', () => {
  console.log(`The mascots' playground: http://localhost:${values.port}/`);
});
