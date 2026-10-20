import type { SoundFiles } from '#shared/protocol.ts';
import { dataUrlBytes } from '#shared/packs/sniff.ts';
import {
  type RecordedSoundsRequest,
  RecordedSoundsResponseSchema,
} from '#shared/recorded-sounds.ts';
import { messageType } from '#shared/prefix.ts';
import { SOUND_NAMES } from '#shared/sounds.ts';
import { askWorker } from '#content/platform/runtime.ts';

// The Boxwood set's takes, from the background worker (background/recorded-sounds.ts),
// asked for once per page and only once it's picked.

let loading: Promise<SoundFiles> | null = null;

async function load(): Promise<SoundFiles> {
  const request: RecordedSoundsRequest = { type: messageType('recorded-sounds') };
  const { sounds } = RecordedSoundsResponseSchema.parse(await askWorker(request));
  const files: SoundFiles = {};
  for (const name of SOUND_NAMES) {
    const takes = sounds[name];
    if (takes) files[name] = takes.map(dataUrlBytes);
  }
  return files;
}

/** The set's sounds as bytes, each its takes; none, so Lichess's, if they can't be read. */
export function recordedSounds(): Promise<SoundFiles> {
  loading ??= load().catch((error: unknown) => {
    console.warn('[LichessNeo] the recorded sounds', error);
    loading = null;
    return {};
  });
  return loading;
}
