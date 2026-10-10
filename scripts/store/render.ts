// Renders the pages in store/templates: public/icons/icon<n>.png for the icon's
// page, store/<name>.png for any other. Needs
// Playwright's Chromium (`pnpm exec playwright install chromium`).
//
//   node scripts/store/render.ts [name…]

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { fromRoot, ROOT } from '#scripts/lib/paths.ts';
import { planShots, selectTemplates } from './render-plan.ts';

const TEMPLATES = fromRoot('store/templates');
const DIRS = { store: fromRoot('store'), icons: fromRoot('public/icons') };

const names = selectTemplates(await readdir(TEMPLATES), process.argv.slice(2));
const browser = await chromium.launch({ channel: 'chromium' });
try {
  for (const name of names) {
    const file = path.join(TEMPLATES, `${name}.html`);
    for (const shot of planShots(name, await readFile(file, 'utf8'), DIRS)) {
      const page = await browser.newPage({
        viewport: shot.viewport,
        deviceScaleFactor: shot.deviceScaleFactor,
      });
      await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle' });
      await page.evaluate('document.fonts.ready.then(() => true)');
      await page.screenshot({ path: shot.output, omitBackground: shot.transparent });
      await page.close();
      console.log(`${path.relative(ROOT, shot.output)}  ${shot.size}`);
    }
  }
} finally {
  await browser.close();
}
