import type { Feature } from '#shared/features.ts';
import { onPageReady, postSounds, type SoundFiles } from '#shared/protocol.ts';
import { setLoading, showPacks, soundFiles } from './apply.ts';
import { watchDasher } from './dasher.ts';
import { createLibrary, LICHESS, storedPick, type Library, type Shown } from './library.ts';
import { PART_KINDS, type Pack } from '#shared/packs/pack.ts';
import { deletePack, readPack, readPacks, writePack } from './store.ts';

// Lichess's own board, pieces and sounds, unless the user picked a pack they
// imported from GitHub (docs/packs.md) for one of them. Started first, from
// document_start: a picked board or set is hidden until it's read, so the
// page never shows Lichess's first.

// Only the picked packs: the menu reads the others when it opens.
async function loadPicked(): Promise<Pack[]> {
  const ids = new Set(PART_KINDS.map(storedPick).filter(id => id !== LICHESS));
  try {
    const packs = await Promise.all([...ids].map(id => readPack(id)));
    return packs.filter(pack => pack !== null);
  } catch (error) {
    console.error('[LichessReimagined] the imported packs could not be read', error);
    return [];
  }
}

// The page script may start before or after the packs are read: each side
// sends when it's ready, and every new sound pick is sent again.
// A pack imported again has the same id and new sounds: compare the pack itself.
function createSoundSender(): (shown: Shown) => void {
  let files: SoundFiles = {};
  let sent: Pack | null | undefined;
  onPageReady(() => postSounds(files));
  return ({ sound }) => {
    if (sound === sent) return;
    sent = sound;
    files = soundFiles(sound);
    postSounds(files);
  };
}

// IndexedDB answers in milliseconds, but nothing bounds it: past this, the
// page shows Lichess's, and the pack once it's read.
const LOADING_MAX_MS = 2000;

/** Reads the packs and shows the picked ones; the library, for the menu. */
export async function startPacks(): Promise<Library> {
  setLoading([
    ...(storedPick('board') === LICHESS ? [] : ['board']),
    ...(storedPick('piece') === LICHESS ? [] : ['pieces']),
  ]);
  const timer = window.setTimeout(() => setLoading([]), LOADING_MAX_MS);
  const sendSounds = createSoundSender();
  try {
    return createLibrary({
      packs: await loadPicked(),
      readAll: readPacks,
      save: writePack,
      erase: deletePack,
      show: shown => {
        showPacks({ board: shown.board, pieces: shown.piece });
        sendSounds(shown);
      },
    });
  } finally {
    window.clearTimeout(timer);
    setLoading([]);
  }
}

export const packs: Feature = {
  name: 'packs',
  start: () => {
    startPacks()
      .then(watchDasher)
      .catch((error: unknown) => console.error('[LichessReimagined] packs failed', error));
  },
};
