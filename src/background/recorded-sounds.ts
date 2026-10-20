import { dataUrl } from '#shared/packs/sniff.ts';
import {
  recordedTakePaths,
  RecordedSoundsRequestSchema,
  type RecordedSoundsResponse,
} from '#shared/recorded-sounds.ts';

// Reads the Boxwood set's files for the content script, which can't load them
// in Firefox (it holds a content script's fetch to the page's CSP). Read once
// per worker: they never change while it runs.

async function readTake(path: string): Promise<string> {
  const response = await fetch(chrome.runtime.getURL(path));
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return dataUrl('audio/ogg', new Uint8Array(await response.arrayBuffer()));
}

async function readSet(): Promise<RecordedSoundsResponse> {
  const sounds: RecordedSoundsResponse['sounds'] = {};
  await Promise.all(
    [...recordedTakePaths()].map(async ([name, paths]) => {
      sounds[name] = await Promise.all(paths.map(readTake));
    }),
  );
  return { sounds };
}

let reading: Promise<RecordedSoundsResponse> | null = null;

function answer(): Promise<RecordedSoundsResponse> {
  reading ??= readSet().catch((error: unknown) => {
    console.error('[LichessNeo] the recorded sounds could not be read', error);
    reading = null;
    return { sounds: {} };
  });
  return reading;
}

export function serveRecordedSounds(): void {
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    // Not ours: no answer, as if this listener weren't there.
    if (!RecordedSoundsRequestSchema.safeParse(message).success) return undefined;
    void answer().then(sendResponse);
    // Keeps the channel open for the answer.
    return true;
  });
}
