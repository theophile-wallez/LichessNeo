import { z } from 'zod/mini';
import { CoachMoodSchema } from './coach.ts';
import { SoundNameSchema } from './sounds.ts';

// Messages between the extension's two worlds on a Lichess tab: the isolated
// content script, which can reach the extension's files, and the page script,
// which can reach Lichess's objects. They only share `window.postMessage`.

const PageReadySchema = z.object({ type: z.literal('cdc:page-ready') });

const SoundsSchema = z.object({
  type: z.literal('cdc:sounds'),
  sounds: z.partialRecord(SoundNameSchema, z.instanceof(ArrayBuffer)),
});

const CoachStateSchema = z.object({
  type: z.literal('cdc:coach'),
  coach: z.int(),
  mood: CoachMoodSchema,
  talking: z.boolean(),
});

export type SoundFiles = z.infer<typeof SoundsSchema>['sounds'];
export type CoachState = Omit<z.infer<typeof CoachStateSchema>, 'type'>;

function listen<T>(schema: z.ZodMiniType<T>, handler: (message: T) => void): () => void {
  const listener = (event: MessageEvent<unknown>): void => {
    if (event.source !== window) return;
    const result = schema.safeParse(event.data);
    if (result.success) handler(result.data);
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

function post(message: unknown): void {
  window.postMessage(message, location.origin);
}

/** Page → content: the page script is listening, send the sounds. */
export const postPageReady = (): void => post({ type: 'cdc:page-ready' });
export const onPageReady = (handler: () => void): (() => void) => listen(PageReadySchema, handler);

/** Content → page: the picked pack's sounds, none for Lichess's own; sent again on every pick. */
export const postSounds = (sounds: SoundFiles): void => post({ type: 'cdc:sounds', sounds });
export const onSounds = (handler: (sounds: SoundFiles) => void): (() => void) =>
  listen(SoundsSchema, message => handler(message.sounds));

/** Page → content: which coach the review shows, and how it looks. */
export const postCoachState = (state: CoachState): void => post({ type: 'cdc:coach', ...state });
export const onCoachState = (handler: (state: CoachState) => void): (() => void) =>
  listen(CoachStateSchema, ({ coach, mood, talking }) => handler({ coach, mood, talking }));
