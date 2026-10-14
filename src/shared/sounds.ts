import { z } from 'zod/mini';

// The sounds a pack may have (its pack.json's `sounds`, docs/packs.md), each
// played where Lichess plays one of its own or has none.
export const SoundNameSchema = z.enum([
  'move-self',
  'move-opponent',
  'move-check',
  'capture',
  'castle',
  'promote',
  'premove',
  'illegal',
  'notify',
  'tenseconds',
  'game-start',
  'game-end',
]);

export type SoundName = z.infer<typeof SoundNameSchema>;
export const SOUND_NAMES: readonly SoundName[] = SoundNameSchema.options;

/** The extension's own sound set, synthesized as it plays (page/sounds/synth). */
export const SYNTH_SET = 'foley';

/** Where that set puts a move's sound: around the listener, left or right, or in the middle. */
export const SoundPlaceSchema = z.enum(['space', 'stereo', 'none']);

export type SoundPlace = z.infer<typeof SoundPlaceSchema>;
