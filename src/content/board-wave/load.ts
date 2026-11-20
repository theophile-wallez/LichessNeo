import { z } from 'zod/mini';
import { OUTPUT } from '#manifest';
import { extensionUrl } from '#content/platform/runtime.ts';
import type { WavePlan } from './wave/run.ts';

// The wave's bundle, loaded once, the first time a wave plays or a game's page
// with the end's wave opens: its shaders and its picture of the board have no
// place in the script that runs on every page.

export type PlayWave = (
  findBoard: () => HTMLElement | null,
  plan: WavePlan,
  signal?: AbortSignal,
) => Promise<void>;

const isFunction = (value: unknown): boolean => typeof value === 'function';

const WaveModuleSchema = z.object({
  playWave: z.custom<PlayWave>(isFunction),
  warmWave: z.custom<() => void>(isFunction),
});

type WaveModule = z.infer<typeof WaveModuleSchema>;

let loading: Promise<WaveModule | null> | null = null;

function loadModule(): Promise<WaveModule | null> {
  loading ??= import(extensionUrl(OUTPUT.wave)).then(
    (module: unknown) => WaveModuleSchema.parse(module),
    (error: unknown) => {
      console.warn('[LichessNeo] the board wave', error);
      return null;
    },
  );
  return loading;
}

/** The wave's player, or null if its bundle won't load. */
export const loadWave = async (): Promise<PlayWave | null> =>
  (await loadModule())?.playWave ?? null;

/** Loads the bundle and compiles its shaders ahead, for a wave that must play at once. */
export async function warmWave(): Promise<void> {
  (await loadModule())?.warmWave();
}
