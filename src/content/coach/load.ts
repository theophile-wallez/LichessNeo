import { z } from 'zod/mini';
import { OUTPUT } from '#manifest';
import { coachOptions } from '#shared/coach.ts';
import { extensionUrl } from '#content/platform/runtime.ts';
import { currentSettings, settingsRead } from '#content/settings/settings.ts';
import type { MascotOptions, MascotView } from './mascot/index.ts';

// The 3D mascots' bundle, loaded once, the first time a coach shows: three.js
// is too big for the content script that runs on every page. Never, if the
// settings keep the coaches still.

export type MountMascot = (host: HTMLElement, options?: MascotOptions) => MascotView | null;

const MascotModuleSchema = z.object({
  mountMascot: z.custom<MountMascot>(value => typeof value === 'function'),
});

let loading: Promise<MountMascot | null> | null = null;

/** Whether the coaches play as 3D mascots: as the settings say, or as last kept until they're read. */
export function coachesMove(): boolean {
  return settingsRead() ? currentSettings().coachMotion : coachOptions().motion;
}

/** The mascots' mount, or null if they're kept still or their bundle won't load: the coach stays a still image. */
export function loadMascots(): Promise<MountMascot | null> {
  if (!coachesMove()) return Promise.resolve(null);
  loading ??= import(extensionUrl(OUTPUT.mascot)).then(
    (module: unknown) => MascotModuleSchema.parse(module).mountMascot,
    (error: unknown) => {
      console.warn('[LichessNeo] the coach mascots', error);
      return null;
    },
  );
  return loading;
}
