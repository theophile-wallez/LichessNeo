import { z } from 'zod/mini';
import { ManifestSchema } from './manifest.ts';
import { messageType } from '#shared/prefix.ts';

// The content script asks the background worker for a pack's pack.json, then
// for each of its files (shared/packs/download.ts), over chrome.runtime. Kept
// apart from protocol.ts, which uses `window`, so the worker can import it.

const FOLDER = {
  link: z.string(),
  /** A private repository's, '' for none: used for this import only. */
  token: z.string(),
};

export const ManifestRequestSchema = z.object({
  type: z.literal(messageType('pack-manifest')),
  ...FOLDER,
});

export const FileRequestSchema = z.object({
  type: z.literal(messageType('pack-file')),
  ...FOLDER,
  path: z.string(),
  kind: z.enum(['image', 'sound']),
});

const ErrorSchema = z.object({ error: z.string() });

export const ManifestResponseSchema = z.union([
  z.object({ source: z.string(), manifest: ManifestSchema }),
  ErrorSchema,
]);

export const FileResponseSchema = z.union([z.object({ url: z.string() }), ErrorSchema]);

export type ManifestRequest = z.infer<typeof ManifestRequestSchema>;
export type FileRequest = z.infer<typeof FileRequestSchema>;
