import { DownloadResponseSchema, type DownloadResponse } from '#shared/packs/messages.ts';
import { PIECE_NAMES, type Pack } from '#shared/packs/pack.ts';
import { askWorker } from '#content/platform/runtime.ts';
import { messageType } from '#shared/prefix.ts';

// Imports a pack: the background worker downloads it (shared/packs/download.ts),
// then each image is drawn once here, where there's a DOM. Lichess decodes
// every piece before it draws the board, and draws none if one fails.

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

interface PackImage {
  readonly what: string;
  readonly url: string;
}

/** What of the pack the browser can't draw, or null. */
async function undrawable({ pieces, board }: Pack): Promise<string | null> {
  const images: PackImage[] = [
    ...(pieces ? PIECE_NAMES.map(name => ({ what: `The piece ${name}`, url: pieces[name] })) : []),
    ...(board ? [{ what: 'The board', url: board.image }] : []),
  ];
  const drawn = await Promise.all(images.map(image => decodes(image.url)));
  return images.find((_, i) => drawn[i] !== true)?.what ?? null;
}

const NO_ANSWER = 'The extension did not answer: try again.';

/** Downloads the pack a link points at, with a private repository's token ('' for none). */
export async function fetchPack(link: string, token: string): Promise<DownloadResponse> {
  let answer: unknown;
  try {
    answer = await askWorker({ type: messageType('download-pack'), link, token });
  } catch (error) {
    // Chrome says so when the extension was updated or reloaded under this page.
    const updated = error instanceof Error && error.message.includes('context invalidated');
    return { error: updated ? 'The extension was updated: reload the page.' : NO_ANSWER };
  }
  const response = DownloadResponseSchema.safeParse(answer);
  if (!response.success) return { error: 'The pack could not be downloaded.' };
  if ('error' in response.data) return response.data;
  const broken = await undrawable(response.data.pack);
  return broken === null ? response.data : { error: `${broken} can't be drawn.` };
}
