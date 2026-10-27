import { type Import, importPacks, type PackFolder } from '#shared/packs/assemble.ts';
import { PackError } from '#shared/packs/github.ts';
import {
  type FileRequest,
  FileResponseSchema,
  type ManifestRequest,
  ManifestResponseSchema,
} from '#shared/packs/messages.ts';
import { PIECE_NAMES, type Pack } from '#shared/packs/pack.ts';
import { askWorker } from '#content/platform/runtime.ts';
import { messageType } from '#shared/prefix.ts';
import type { z } from 'zod/mini';

// Imports a pack.json's packs: the background worker reads it, then each file
// on its own (shared/packs/download.ts), and they're put together here
// (shared/packs/assemble.ts). Each image is then drawn once, as that needs a
// DOM: Lichess decodes every piece before it draws the board, and draws none
// if one fails.

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

async function decodes(url: string): Promise<boolean> {
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
    return true;
  } catch {
    return false;
  }
}

/** What of the pack the browser can't draw, or null. */
async function undrawable({ pieces, board }: Pack): Promise<string | null> {
  const images = [
    ...(pieces ? PIECE_NAMES.map(name => ({ what: `The piece ${name}`, url: pieces[name] })) : []),
    ...(board ? [{ what: 'The board', url: board.image }] : []),
  ];
  const drawn = await Promise.all(images.map(image => decodes(image.url)));
  return images.find((_, i) => drawn[i] !== true)?.what ?? null;
}

/** What of the packs the browser can't draw, naming its pack when there are several, or null. */
async function firstUndrawable(packs: readonly Pack[]): Promise<string | null> {
  const broken = await Promise.all(
    packs.map(async pack => {
      const what = await undrawable(pack);
      return what !== null && packs.length > 1 ? `${what} of “${pack.name}”` : what;
    }),
  );
  return broken.find(what => what !== null) ?? null;
}

/** Downloads the packs a link points at, with a private repository's token ('' for none). */
export async function fetchPacks(link: string, token: string): Promise<Import> {
  const imported = await importPacks(workerFolder(link, token), link);
  if ('error' in imported) return imported;
  const broken = await firstUndrawable(imported.packs);
  return broken === null ? imported : { error: `${broken} can't be drawn.` };
}
