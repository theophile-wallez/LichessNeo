import { type CueName, play, type PlayOptions } from '@foleyjs/core';
import { currentSettings } from '#content/settings/settings.ts';

// The interface's own sounds: Foley's cues, synthesized with Web Audio (no
// file to load, so nothing the page's CSP holds back), played only while the
// interface sounds setting is on (content/settings). Lichess's sounds and a
// pack's go their own way (content/packs, page/sounds).

/** Plays a cue, unless the user turned the interface sounds off. Call it from a user's gesture. */
export function playUiSound(cue: CueName, options?: PlayOptions): void {
  if (currentSettings().uiSounds) play(cue, options);
}
