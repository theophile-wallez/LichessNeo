import { z } from 'zod/mini';
import { CoachMoodSchema } from '#shared/coach.ts';
import { parseJson } from '#shared/json.ts';
import { EditsSchema, HexSchema } from './cast.ts';

// What the playground remembers across reloads (it reloads on every rebuild):
// who's on stage, how it's shown, and the edits made to each character.

const STORAGE_KEY = 'mascot-playground';

const FurTuningSchema = z.object({
  length: z.number(),
  density: z.number(),
  layers: z.number(),
});

const SettingsSchema = z.object({
  actor: z.string(),
  framing: z.enum(['bust', 'full']),
  mood: CoachMoodSchema,
  talking: z.boolean(),
  follow: z.boolean(),
  speed: z.number(),
  size: z.number(),
  background: HexSchema,
  fur: FurTuningSchema,
  edits: z.record(z.string(), EditsSchema),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type FurTuning = z.infer<typeof FurTuningSchema>;

export const PLAIN_FUR: FurTuning = { length: 1, density: 1, layers: 1 };

export const DEFAULTS: Settings = {
  actor: 'coach-1',
  framing: 'bust',
  mood: 'neutral',
  talking: false,
  follow: true,
  speed: 1,
  size: 560,
  background: '#262421',
  fur: PLAIN_FUR,
  edits: {},
};

export function loadSettings(): Settings {
  // Settings added since they were saved take their defaults.
  const stored = parseJson(localStorage.getItem(STORAGE_KEY), z.record(z.string(), z.unknown()));
  const result = SettingsSchema.safeParse({ ...DEFAULTS, ...stored });
  return result.success ? result.data : DEFAULTS;
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
