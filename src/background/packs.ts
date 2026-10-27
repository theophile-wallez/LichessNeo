import { downloadFile, downloadManifest } from '#shared/packs/download.ts';
import { FileRequestSchema, ManifestRequestSchema } from '#shared/packs/messages.ts';

// Reads the pack.json and files the content script asks for: from here,
// GitHub is in reach in every browser, with no host permission (its files
// allow any origin). Each request is whole on its own: Chrome may end an idle
// worker between two of them.

// Chrome ends a worker idle for 30 s, and its fetches don't count: an
// extension call does, so a slow file makes one now and then.
const KEEP_AWAKE_MS = 20_000;

function answerOf(message: unknown): Promise<unknown> | null {
  const manifest = ManifestRequestSchema.safeParse(message);
  if (manifest.success) return downloadManifest(manifest.data.link, manifest.data.token);
  const file = FileRequestSchema.safeParse(message);
  if (!file.success) return null;
  const { link, token, path, kind } = file.data;
  return downloadFile(link, token, path, kind);
}

export function servePackDownloads(): void {
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    const answer = answerOf(message);
    // Not ours: no answer, as if this listener weren't there.
    if (answer === null) return undefined;
    const awake = setInterval(() => void chrome.runtime.getPlatformInfo(), KEEP_AWAKE_MS);
    void answer
      .catch((error: unknown) => {
        console.error('[LichessNeo] pack download failed', error);
        return { error: 'The pack could not be downloaded.' };
      })
      .then(sendResponse)
      .finally(() => clearInterval(awake));
    // Keeps the channel open for the answer.
    return true;
  });
}
