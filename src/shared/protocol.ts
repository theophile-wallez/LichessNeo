import { z } from 'zod/mini';
import { CoachMoodSchema, CoachOptionsSchema, type CoachOptions } from './coach.ts';
import { CustomSeekSchema, type CustomSeek } from './custom-seek.ts';
import { RoundnessSchema } from './roundness.ts';
import { SoundNameSchema, SoundPlaceSchema } from './sounds.ts';
import { messageType } from './prefix.ts';

// Messages between the extension's two worlds on a Lichess tab: the isolated
// content script, which can reach the extension's files, and the page script,
// which can reach Lichess's objects. They only share `window.postMessage`.

const PageReadySchema = z.object({ type: z.literal(messageType('page-ready')) });

const SoundsSchema = z.object({
  type: z.literal(messageType('sounds')),
  // Each sound's takes, one or more: each time it plays, one of them at random.
  sounds: z.partialRecord(SoundNameSchema, z.array(z.instanceof(ArrayBuffer))),
  // The extension's own set, played in place of any files; absent for a pack's or Lichess's.
  synth: z.optional(z.object({ place: SoundPlaceSchema })),
});

const CoachStateSchema = z.object({
  type: z.literal(messageType('coach')),
  coach: z.int(),
  mood: CoachMoodSchema,
  talking: z.boolean(),
});

const CoachPickerSchema = z.object({
  type: z.literal(messageType('coach-picker')),
  coach: z.int(),
});

const CoachPickedSchema = z.object({
  type: z.literal(messageType('coach-picked')),
  coach: z.int(),
});

const CoachOptionsMessageSchema = z.object({
  type: z.literal(messageType('coach-options')),
  options: CoachOptionsSchema,
});

/** Lichess's own color schemes, as its Theme menu offers them. */
export const ColorSchemeSchema = z.enum(['system', 'light', 'dark']);

const ColorSchemePickSchema = z.object({
  type: z.literal(messageType('color-scheme')),
  scheme: ColorSchemeSchema,
});

const RoundnessPickSchema = z.object({
  type: z.literal(messageType('roundness')),
  radius: RoundnessSchema,
});

const LichessLookSchema = z.object({
  type: z.literal(messageType('lichess-look')),
  part: z.enum(['board', 'piece', 'sound']),
  id: z.string(),
});

const LichessLookPreviewSchema = z.object({
  type: z.literal(messageType('lichess-look-preview')),
  part: z.enum(['board', 'piece']),
  id: z.nullable(z.string()),
});

/** What the settings' preview board does: drawn, its game played through, or one move on. */
const PreviewActionSchema = z.enum(['draw', 'play', 'step']);

const LooksPreviewSchema = z.object({
  type: z.literal(messageType('looks-preview')),
  action: PreviewActionSchema,
});

const CustomSeekRequestSchema = z.object({
  type: z.literal(messageType('custom-seek')),
  seek: z.nullable(CustomSeekSchema),
});

const CustomSeekStateSchema = z.object({
  type: z.literal(messageType('custom-seek-state')),
  seeking: z.boolean(),
});

export type ColorScheme = z.infer<typeof ColorSchemeSchema>;
export type LichessLookPick = Omit<z.infer<typeof LichessLookSchema>, 'type'>;
export type LichessLookPreview = Omit<z.infer<typeof LichessLookPreviewSchema>, 'type'>;
export type PreviewAction = z.infer<typeof PreviewActionSchema>;
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

/** Page → content: the review's coach was clicked, open the coaches to pick one; `coach` shows now. */
export const postCoachPicker = (coach: number): void =>
  post({ type: messageType('coach-picker'), coach });
export const onCoachPicker = (handler: (coach: number) => void): (() => void) =>
  listen(CoachPickerSchema, message => handler(message.coach));

/** Content → page: the coach picked in the coach picker, already kept. */
export const postCoachPicked = (coach: number): void =>
  post({ type: messageType('coach-picked'), coach });
export const onCoachPicked = (handler: (coach: number) => void): (() => void) =>
  listen(CoachPickedSchema, message => handler(message.coach));

/** Content → page: the settings' coach switches changed, here or in another tab. */
export const postCoachOptions = (options: CoachOptions): void =>
  post({ type: messageType('coach-options'), options });
export const onCoachOptions = (handler: (options: CoachOptions) => void): (() => void) =>
  listen(CoachOptionsMessageSchema, message => handler(message.options));

/** Content → page: the color scheme picked in the extension's settings, for Lichess to keep. */
export const postColorScheme = (scheme: ColorScheme): void =>
  post({ type: messageType('color-scheme'), scheme });
export const onColorScheme = (handler: (scheme: ColorScheme) => void): (() => void) =>
  listen(ColorSchemePickSchema, message => handler(message.scheme));

/** Content → page: Lichess's Roundness, in px, set in the extension's settings, for Lichess to keep. */
export const postRoundness = (radius: number): void =>
  post({ type: messageType('roundness'), radius });
export const onRoundness = (handler: (radius: number) => void): (() => void) =>
  listen(RoundnessPickSchema, message => handler(message.radius));

/** Content → page: one of Lichess's boards, piece sets or sound sets, picked in the settings. */
export const postLichessLook = (pick: LichessLookPick): void =>
  post({ type: messageType('lichess-look'), ...pick });
export const onLichessLook = (handler: (pick: LichessLookPick) => void): (() => void) =>
  listen(LichessLookSchema, ({ part, id }) => handler({ part, id }));

/**
 * Content → page: one of Lichess's boards or piece sets shown a moment, unsaved, while its tile
 * in the settings is hovered; null puts the one picked back.
 */
export const postLichessLookPreview = (preview: LichessLookPreview): void =>
  post({ type: messageType('lichess-look-preview'), ...preview });
export const onLichessLookPreview = (
  handler: (preview: LichessLookPreview) => void,
): (() => void) => listen(LichessLookPreviewSchema, ({ part, id }) => handler({ part, id }));

/** Content → page: the settings' preview board, drawn or played in the page world. */
export const postLooksPreview = (action: PreviewAction): void =>
  post({ type: messageType('looks-preview'), action });
export const onLooksPreview = (handler: (action: PreviewAction) => void): (() => void) =>
  listen(LooksPreviewSchema, ({ action }) => handler(action));

/** Content → page: a home card's game to seek in the lobby, or null to stop seeking it. */
export const postCustomSeek = (seek: CustomSeek | null): void =>
  post({ type: messageType('custom-seek'), seek });
export const onCustomSeek = (handler: (seek: CustomSeek | null) => void): (() => void) =>
  listen(CustomSeekRequestSchema, ({ seek }) => handler(seek));

/** Page → content: whether that game is still sought; false once it stopped or failed. */
export const postCustomSeekState = (seeking: boolean): void =>
  post({ type: messageType('custom-seek-state'), seeking });
export const onCustomSeekState = (handler: (seeking: boolean) => void): (() => void) =>
  listen(CustomSeekStateSchema, ({ seeking }) => handler(seeking));
