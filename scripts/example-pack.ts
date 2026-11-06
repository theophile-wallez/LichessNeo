// Writes packs/warm-wood.zip, the example pack as the settings' Export would
// save it: its pack.json at the top, beside its files, and none of its
// READMEs. Run it (`node scripts/example-pack.ts`) after changing
// packs/example: a test fails until then.

import { writeFile } from 'node:fs/promises';
import { examplePackZip, EXAMPLE_ZIP } from './lib/example-pack.ts';

await writeFile(EXAMPLE_ZIP, await examplePackZip());
console.log('Wrote packs/warm-wood.zip.');
