import { type Import, importPacks, type PackFolder } from '#shared/packs/assemble.ts';
import { PackError } from '#shared/packs/github.ts';
import {
  type FileRequest,
  FileResponseSchema,
  type ManifestRequest,
  ManifestResponseSchema,
} from '#shared/packs/messages.ts';
import { askWorker } from '#content/platform/runtime.ts';
import { messageType } from '#shared/prefix.ts';
import type { z } from 'zod/mini';
import { drawable } from './drawable.ts';

// Imports a pack.json's packs: the background worker reads it, then each file
// on its own (shared/packs/download.ts), and they're put together here
// (shared/packs/assemble.ts), then each image is drawn once (drawable.ts).

const UNREADABLE = 'The pack could not be downloaded.';

async function ask<T>(
  request: ManifestRequest | FileRequest,
  schema: z.ZodMiniType<T>,
): Promise<T> {
  let answer: unknown;
  try {
    answer = await askWorker(request);
  } catch (error) {
    // Chrome says so when the extension was updated or reloaded under this page.
    const updated = error instanceof Error && error.message.includes('context invalidated');
    throw new PackError(
      updated
        ? 'The extension was updated: reload the page.'
        : 'The extension did not answer: try again.',
    );
  }
  const response = schema.safeParse(answer);
  if (!response.success) throw new PackError(UNREADABLE);
  return response.data;
}

const workerFolder = (link: string, token: string): PackFolder => ({
  manifest: () => ask({ type: messageType('pack-manifest'), link, token }, ManifestResponseSchema),
  file: (path, kind) =>
    ask({ type: messageType('pack-file'), link, token, path, kind }, FileResponseSchema),
});

/** Downloads the packs a link points at, with a private repository's token ('' for none). */
export async function fetchPacks(link: string, token: string): Promise<Import> {
  return drawable(await importPacks(workerFolder(link, token), link));
}
