import { downloadPack } from '#shared/packs/download.ts';
import { DownloadRequestSchema, type DownloadResponse } from '#shared/packs/messages.ts';

// Downloads the packs the content script asks for: from here, GitHub is in
// reach in every browser, with no host permission (its files allow any origin).

// Chrome ends a worker idle for 30 s, and its fetches don't count: an
// extension call does, so a long download makes one now and then.
const KEEP_AWAKE_MS = 20_000;

async function answer(link: string, token: string): Promise<DownloadResponse> {
  const awake = setInterval(() => void chrome.runtime.getPlatformInfo(), KEEP_AWAKE_MS);
  try {
    return await downloadPack(link, token);
  } catch (error) {
    console.error('[LichessNeo] pack download failed', error);
    return { error: 'The pack could not be downloaded.' };
  } finally {
    clearInterval(awake);
  }
}

export function servePackDownloads(): void {
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    const request = DownloadRequestSchema.safeParse(message);
    // Not ours: no answer, as if this listener weren't there.
    if (!request.success) return undefined;
    void answer(request.data.link, request.data.token).then(sendResponse);
    // Keeps the channel open for the answer.
    return true;
  });
}
