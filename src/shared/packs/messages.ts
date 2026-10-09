import { z } from 'zod/mini';
import { PackSchema } from './pack.ts';
import { messageType } from '#shared/prefix.ts';

// The content script asks the background worker to download a pack
// (shared/packs/download.ts), over chrome.runtime. Kept apart from
// protocol.ts, which uses `window`, so the worker can import it.

export const DownloadRequestSchema = z.object({
  type: z.literal(messageType('download-pack')),
  link: z.string(),
  /** A private repository's, '' for none: used for this download only. */
  token: z.string(),
});

export const DownloadResponseSchema = z.union([
  z.object({ pack: PackSchema }),
  z.object({ error: z.string() }),
]);

export type DownloadRequest = z.infer<typeof DownloadRequestSchema>;
export type DownloadResponse = z.infer<typeof DownloadResponseSchema>;
