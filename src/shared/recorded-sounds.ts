import { z } from 'zod/mini';
import { messageType } from './prefix.ts';
import { SOUND_NAMES, SoundNameSchema, type SoundName } from './sounds.ts';

// Boxwood, the extension's recorded sound set: wooden pieces on a board, cut
// out of one microphone recording by tools/boxwood-sounds/cut.py into
// public/sounds/boxwood. The page's CSP keeps it from loading them, so the
// content script asks the background worker for them, as data: URLs.

export const RECORDED_SET = 'boxwood';

/** How many takes each sound has, `<name>-<n>.ogg`; a slide's, three per reach, shortest first. */
export const RECORDED_TAKES: Readonly<Partial<Record<SoundName, number>>> = {
  'move-self': 6,
  'move-opponent': 6,
  'move-knight': 6,
  'move-check': 3,
  'move-slide': 18,
  'move-slide-check': 18,
  capture: 8,
  'capture-check': 2,
  'capture-slide': 18,
  'capture-slide-check': 18,
  castle: 4,
  promote: 4,
  'capture-promote': 4,
  checkmate: 1,
  premove: 3,
};

/** Each take's path in the build, by sound, first take first. */
export function recordedTakePaths(): ReadonlyMap<SoundName, readonly string[]> {
  const paths = new Map<SoundName, readonly string[]>();
  for (const name of SOUND_NAMES) {
    const count = RECORDED_TAKES[name] ?? 0;
    if (count > 0)
      paths.set(
        name,
        Array.from({ length: count }, (_, i) => `sounds/boxwood/${name}-${i + 1}.ogg`),
      );
  }
  return paths;
}

export const RecordedSoundsRequestSchema = z.object({
  type: z.literal(messageType('recorded-sounds')),
});

export const RecordedSoundsResponseSchema = z.object({
  sounds: z.partialRecord(
    SoundNameSchema,
    z.array(z.string().check(z.regex(/^data:audio\/ogg;base64,[A-Za-z0-9+/]*={0,2}$/))),
  ),
});

export type RecordedSoundsRequest = z.infer<typeof RecordedSoundsRequestSchema>;
export type RecordedSoundsResponse = z.infer<typeof RecordedSoundsResponseSchema>;
