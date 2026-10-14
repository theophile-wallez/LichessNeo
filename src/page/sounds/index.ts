import type { Feature } from '#shared/features.ts';
import { onSounds, postPageReady } from '#shared/protocol.ts';
import type { SoundName } from '#shared/sounds.ts';
import type { SoundPlayer } from '#page/lichess/sound.ts';
import { watchMoveAttempts } from './attempts.ts';
import { watchGameStart } from './game-start.ts';
import { replaceSounds, whenSoundPlayerReady } from './install.ts';
import { hookSoundPlayer, setSoundPaths } from './player.ts';
import { createSynth, type Synth } from './synth/synth.ts';
import { createSession } from './session.ts';

// The sounds of the pack the user picked, or the extension's own set, in place
// of Lichess's. The content script reads the pack and posts its sounds here,
// where Lichess's sound player lives, and posts again on every pick. Premoves,
// refused moves and game starts get a sound Lichess has none for. With neither,
// Lichess's player is left alone.

function start(): void {
  const session = createSession();
  watchMoveAttempts(session);
  const gameStart = watchGameStart(session);
  const urls = new Map<SoundName, string>();
  // Made once, the first time the set is picked; `live` while it's the pick.
  let synth: Synth | null = null;
  let live: Synth | null = null;
  let player: SoundPlayer | null = null;
  let waiting = false;
  onSounds((files, pick) => {
    replaceSounds(urls, files);
    if (pick) {
      synth ??= createSynth(pick.place);
      synth.setPlace(pick.place);
    }
    live = pick ? synth : null;
    if (player) setSoundPaths(player, urls);
    if (player || waiting || (urls.size === 0 && !live)) return;
    waiting = true;
    whenSoundPlayerReady(sound => {
      player = sound;
      if (hookSoundPlayer(sound, urls, session, () => live)) gameStart.play();
    });
  });
  postPageReady();
}

export const sounds: Feature = { name: 'sounds', start };
