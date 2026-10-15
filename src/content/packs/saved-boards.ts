import { z } from 'zod/mini';
import { readStoredJson, StorageKey, writeStoredJson } from '#shared/storage.ts';
import { HexSchema, type SquareColors } from './custom-board.ts';

// The custom boards the user saved under a name (color-row.ts): each one of
// the extension's boards from then on, until they delete it in the settings.

export const MAX_SAVED_BOARDS = 24;
export const MAX_BOARD_NAME = 24;
const ID_PREFIX = 'saved-';

const SavedBoardSchema = z.object({
  id: z.string().check(z.startsWith(ID_PREFIX)),
  name: z.string().check(z.minLength(1), z.maxLength(MAX_BOARD_NAME)),
  light: HexSchema,
  dark: HexSchema,
});

export type SavedBoard = z.infer<typeof SavedBoardSchema>;

// Unreadable, the list is dropped rather than every board in it.
const SavedBoardsSchema = z.catch(
  z.array(SavedBoardSchema).check(z.maxLength(MAX_SAVED_BOARDS)),
  [],
);

let cached: readonly SavedBoard[] | null = null;
let listening = false;
const listeners = new Set<() => void>();

// Another tab's save or delete: read the list again.
function listenToOtherTabs(): void {
  if (listening) return;
  listening = true;
  window.addEventListener('storage', event => {
    if (event.key !== StorageKey.savedBoards) return;
    cached = null;
    for (const listener of listeners) listener();
  });
}

/** The saved boards, oldest first; a new list each time one is saved or deleted. */
export function savedBoards(): readonly SavedBoard[] {
  if (cached) return cached;
  cached = readStoredJson(StorageKey.savedBoards, SavedBoardsSchema) ?? [];
  listenToOtherTabs();
  return cached;
}

function write(boards: readonly SavedBoard[]): void {
  writeStoredJson(StorageKey.savedBoards, boards);
  cached = boards;
  for (const listener of listeners) listener();
}

/** Saves `colors` as a board named `name`; its id, or null once the list is full. */
export function saveBoard(name: string, colors: SquareColors): string | null {
  const boards = savedBoards();
  if (boards.length >= MAX_SAVED_BOARDS) return null;
  const id = `${ID_PREFIX}${Date.now().toString(36)}`;
  write([...boards, { id, name, ...colors }]);
  return id;
}

export function deleteBoard(id: string): void {
  write(savedBoards().filter(board => board.id !== id));
}

export const onSavedBoardsChange = (listener: () => void): void => {
  listeners.add(listener);
};
