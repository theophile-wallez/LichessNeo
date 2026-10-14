import { z } from 'zod/mini';
import { CoachMoodSchema } from './coach.ts';
import { SoundNameSchema, SoundPlaceSchema } from './sounds.ts';
import { messageType } from './prefix.ts';

// Messages between the extension's two worlds on a Lichess tab: the isolated
// content script, which can reach the extension's files, and the page script,
// which can reach Lichess's objects. They only share `window.postMessage`.

const PageReadySchema = z.object({ type: z.literal(messageType('page-ready')) });

const SoundsSchema = z.object({
  type: z.literal(messageType('sounds')),
  sounds: z.partialRecord(SoundNameSchema, z.instanceof(ArrayBuffer)),
  // The extension's own set, played in place of any files; absent for a pack's or Lichess's.
  synth: z.optional(z.object({ place: SoundPlaceSchema })),
});

const CoachStateSchema = z.object({
  type: z.literal(messageType('coach')),
  coach: z.int(),
  mood: CoachMoodSchema,
  talking: z.boolean(),
});

/** Lichess's own color schemes, as its Theme menu offers them. */
export const ColorSchemeSchema = z.enum(['system', 'light', 'dark']);

const ColorSchemePickSchema = z.object({
  type: z.literal(messageType('color-scheme')),
  scheme: ColorSchemeSchema,
});

export type ColorScheme = z.infer<typeof ColorSchemeSchema>;
export type SoundFiles = z.infer<typeof SoundsSchema>['sounds'];
export type SynthPick = NonNullable<z.infer<typeof SoundsSchema>['synth']>;
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
export const postPageReady = (): void => post({ type: messageType('page-ready') });
export const onPageReady = (handler: () => void): (() => void) => listen(PageReadySchema, handler);

/**
 * Content → page: the picked pack's sounds, none for Lichess's own, or the extension's own
 * set; sent again on every pick.
 */
export const postSounds = (sounds: SoundFiles, synth: SynthPick | null = null): void =>
  post({ type: messageType('sounds'), sounds, ...(synth ? { synth } : {}) });
export const onSounds = (
  handler: (sounds: SoundFiles, synth: SynthPick | null) => void,
): (() => void) => listen(SoundsSchema, message => handler(message.sounds, message.synth ?? null));

/** Page → content: which coach the review shows, and how it looks. */
export const postCoachState = (state: CoachState): void =>
  post({ type: messageType('coach'), ...state });
export const onCoachState = (handler: (state: CoachState) => void): (() => void) =>
  listen(CoachStateSchema, ({ coach, mood, talking }) => handler({ coach, mood, talking }));

/** Content → page: the color scheme picked in the extension's settings, for Lichess to keep. */
export const postColorScheme = (scheme: ColorScheme): void =>
  post({ type: messageType('color-scheme'), scheme });
export const onColorScheme = (handler: (scheme: ColorScheme) => void): (() => void) =>
  listen(ColorSchemePickSchema, message => handler(message.scheme));
