import type { Feature } from '#shared/features.ts';
import { onPageReady, postSounds, type SoundFiles } from '#shared/protocol.ts';
import { setLoading, showLooks, soundFiles } from './apply.ts';
import { watchDasher } from './dasher.ts';
import {
  createLibrary,
  isPackId,
  storedPick,
  type Library,
  type Look,
  type Shown,
} from './library.ts';
import { PART_KINDS, type Pack } from '#shared/packs/pack.ts';
import { deletePack, readPack, readPacks, writePack } from './store.ts';

// The board, pieces and sounds: the extension's own themes, Lichess's, or a
// pack the user imported from GitHub (docs/packs.md). Started first, from
// document_start: a board or set from a pack is hidden until it's read, so
// the page never shows another first.

// Only the picked packs: the menu and the settings read the others when they open.
async function readPicked(): Promise<Pack[]> {
  const ids = new Set(PART_KINDS.map(storedPick).filter(isPackId));
  const packs = await Promise.all([...ids].map(id => readPack(id)));
  return packs.filter(pack => pack !== null);
}

// The page script may start before or after the packs are read: each side
// sends when it's ready, and every new sound pick is sent again.
// A pack imported again has the same id and new sounds: compare the pack itself.
function createSoundSender(): (shown: Shown) => void {
  let files: SoundFiles = {};
  let sent: Look | undefined;
  onPageReady(() => postSounds(files));
  return ({ sound }) => {
    if (sound === sent) return;
    sent = sound;
    files = soundFiles(sound);
    postSounds(files);
  };
}

// IndexedDB answers in milliseconds, but nothing bounds it: past this, the
// page shows the part's default, and the pack once it's read.
const LOADING_MAX_MS = 2000;

/** Shows the picks at once, and the picked packs once they're read. */
export function startPacks(): Library {
  setLoading([
    ...(isPackId(storedPick('board')) ? ['board'] : []),
    ...(isPackId(storedPick('piece')) ? ['pieces'] : []),
  ]);
  const timer = window.setTimeout(() => setLoading([]), LOADING_MAX_MS);
  const sendSounds = createSoundSender();
  const library = createLibrary({
    readPicked,
    readAll: readPacks,
    save: writePack,
    erase: deletePack,
    show: shown => {
      showLooks({ board: shown.board, pieces: shown.piece });
      sendSounds(shown);
    },
  });
  void library.ready.finally(() => {
    window.clearTimeout(timer);
    setLoading([]);
  });
  return library;
}

let started: Library | null = null;

/** The page's one library, for the user menu and the settings' imports. */
export const packLibrary = (): Library => (started ??= startPacks());

export const packs: Feature = {
  name: 'packs',
  start: () => watchDasher(packLibrary()),
};
