// Writes the site's snapshot of the coach's opening theory
// (site/demo/theory.json): the positions of the Opera Game that each
// language's study comments, read from its export on lichess.org (or from
// the PGNs tools/openings/theory.py wrote in <folder>), so the page shows the
// theory without asking lichess.org. Run by hand once the studies change,
// then commit site/demo/theory.json:
//
//   node scripts/site/theory-snapshot.ts [folder]

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod/mini';
import { STUDIES } from '#page/review/theory/book.ts';
import { studyPositions } from '#page/review/theory/study.ts';
import { theorySnapshot } from '#scripts/lib/theory-snapshot.ts';
import { fromRoot } from '#scripts/lib/paths.ts';

// Lichess answers a script it takes for a crawler with a 404 page.
const AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/130 Safari/537.36';

const OperaSchema = z.object({ nodes: z.array(z.object({ fen: z.string() })) });

async function exportOf(study: string): Promise<string> {
  const url = `https://lichess.org/api/study/${study}.pgn?comments=true&variations=true&clocks=false&orientation=false`;
  const response = await fetch(url, { headers: { 'User-Agent': AGENT } });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.text();
}

const [folder] = process.argv.slice(2);

function readStudy(language: string, study: string): Promise<string> {
  return folder === undefined ? exportOf(study) : readFile(join(folder, `${language}.pgn`), 'utf8');
}

const opera = OperaSchema.parse(
  JSON.parse(await readFile(fromRoot('site/demo/opera.json'), 'utf8')),
);
const fens = opera.nodes.map(node => node.fen);
const snapshot: Record<string, string> = {};
for (const [language, study] of Object.entries(STUDIES))
  snapshot[study] = theorySnapshot(studyPositions(await readStudy(language, study)), fens);
await writeFile(fromRoot('site/demo/theory.json'), `${JSON.stringify(snapshot, null, 2)}\n`);
