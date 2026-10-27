import { vi } from 'vitest';
import { downloadFile, downloadManifest } from '#shared/packs/download.ts';
import { FileRequestSchema, ManifestRequestSchema } from '#shared/packs/messages.ts';

// Test support: the background worker as the content script reaches it, over
// chrome.runtime.sendMessage, answering for a pack's pack.json and files as it
// does (background/packs.ts), with fetch as the test stubs it.

function answer(message: unknown): Promise<unknown> {
  const manifest = ManifestRequestSchema.safeParse(message);
  if (manifest.success) return downloadManifest(manifest.data.link, manifest.data.token);
  const { link, token, path, kind } = FileRequestSchema.parse(message);
  return downloadFile(link, token, path, kind);
}

export function fakeWorker(): void {
  vi.stubGlobal('chrome', { runtime: { sendMessage: answer } });
}
