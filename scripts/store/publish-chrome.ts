// Sends the store zip to the Chrome Web Store and submits it for review. The
// CI runs it on a `store-*` tag:
//
//   node scripts/store/publish-chrome.ts <store zip> <version>
//
// CWS_SERVICE_ACCOUNT is the JSON key of the service account added under
// Account in the store's dashboard, CWS_PUBLISHER_ID the publisher's id.

import { readFile } from 'node:fs/promises';
import { publishToChromeWebStore } from './chrome-web-store.ts';
import { PublishError } from './http.ts';

// A secret the repository doesn't have comes through as an empty string.
const isSet = (value: string | undefined): value is string => value !== undefined && value !== '';

async function main(): Promise<void> {
  const [zip, version] = process.argv.slice(2);
  const serviceAccount = process.env['CWS_SERVICE_ACCOUNT'];
  const publisherId = process.env['CWS_PUBLISHER_ID'];
  if (!isSet(zip) || !isSet(version))
    throw new PublishError('usage: publish-chrome.ts <store zip> <version>');
  if (!isSet(serviceAccount) || !isSet(publisherId))
    throw new PublishError('the CWS_SERVICE_ACCOUNT and CWS_PUBLISHER_ID secrets must be set');
  await publishToChromeWebStore({ zip: await readFile(zip), version, serviceAccount, publisherId });
}

try {
  await main();
} catch (error) {
  // A GitHub annotation, and no stack trace for a failure we explain.
  console.error(`::error::${error instanceof Error ? error.message : String(error)}`);
  if (!(error instanceof PublishError)) console.error(error);
  process.exitCode = 1;
}
