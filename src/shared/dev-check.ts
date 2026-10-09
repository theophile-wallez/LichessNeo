import { z } from 'zod/mini';
import { messageType } from './prefix.ts';

// A dev build's reload check: the content script asks the
// background worker over chrome.runtime whether the files on disk changed.
// Kept apart from protocol.ts, which uses `window`, so the worker can import it.

export const DevCheckRequestSchema = z.object({ type: z.literal(messageType('dev-check')) });
export const DevCheckResponseSchema = z.object({ reload: z.boolean() });
export type DevCheckRequest = z.infer<typeof DevCheckRequestSchema>;
export type DevCheckResponse = z.infer<typeof DevCheckResponseSchema>;
