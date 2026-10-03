import { z } from 'zod/mini';
import { OUTPUT } from '#manifest';
import { extensionUrl } from '#content/platform/runtime.ts';
import type { MascotOptions, MascotView } from './mascot/index.ts';

// The 3D mascots' bundle, loaded once, the first time a coach shows: three.js
// is too big for the content script that runs on every page.

export type MountMascot = (host: HTMLElement, options?: MascotOptions) => MascotView | null;

const MascotModuleSchema = z.object({
  mountMascot: z.custom<MountMascot>(value => typeof value === 'function'),
});

let loading: Promise<MountMascot | null> | null = null;

/** The mascots' mount, or null if their bundle won't load: the coach stays a still image. */
export function loadMascots(): Promise<MountMascot | null> {
  loading ??= import(extensionUrl(OUTPUT.mascot)).then(
    (module: unknown) => MascotModuleSchema.parse(module).mountMascot,
    (error: unknown) => {
      console.warn('[LichessReimagined] the coach mascots', error);
      return null;
    },
  );
  return loading;
}
