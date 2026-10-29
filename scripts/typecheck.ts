// Type-checks every project: each world of the extension has its own
// tsconfig, so the page script can't reach for `chrome.*` and the
// background worker can't touch the DOM.

import { spawn } from 'node:child_process';
import { fromRoot } from './lib/paths.ts';

const PROJECTS = [
  'src/shared',
  'src/content',
  'src/page',
  'src/background',
  'src/styles',
  'scripts',
  'scripts/site',
  'tests',
  'playground',
  'site',
  '.',
];

function check(project: string): Promise<boolean> {
  return new Promise(resolve => {
    const tsc = spawn(fromRoot('node_modules/.bin/tsc'), ['-p', fromRoot(project), '--pretty'], {
      stdio: 'inherit',
    });
    tsc.on('close', code => resolve(code === 0));
  });
}

const results = await Promise.all(PROJECTS.map(check));
const failed = PROJECTS.filter((_, i) => results[i] !== true);
if (failed.length > 0) {
  console.error(`Type errors in: ${failed.join(', ')}`);
  process.exit(1);
}
console.log(`Types check out in ${PROJECTS.length} projects.`);
