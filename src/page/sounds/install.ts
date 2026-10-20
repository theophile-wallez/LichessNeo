import { pollUntil } from '#shared/poll.ts';
import type { SoundFiles } from '#shared/protocol.ts';
import { SOUND_NAMES, type SoundName } from '#shared/sounds.ts';
import { soundPlayer, type SoundPlayer } from '#page/lichess/sound.ts';

/**
 * Puts the posted sounds' takes in `urls` in place of the ones before, as blob: URLs:
 * Lichess's CSP lets audio load from those, not from the extension. Its
 * player decodes the bytes whatever their type.
 */
export function replaceSounds(urls: Map<SoundName, readonly string[]>, files: SoundFiles): void {
  for (const takes of urls.values()) for (const url of takes) URL.revokeObjectURL(url);
  urls.clear();
  for (const name of SOUND_NAMES) {
    const takes = files[name];
    if (takes && takes.length > 0)
      urls.set(
        name,
        takes.map(bytes => URL.createObjectURL(new Blob([bytes]))),
      );
  }
}

/** Hands over Lichess's sound player once it's set up, for up to 30 seconds. */
export function whenSoundPlayerReady(callback: (sound: SoundPlayer) => void): void {
  pollUntil(soundPlayer, callback, { intervalMs: 50, giveUpMs: 30_000 });
}
