import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SavedBoards from './saved-boards.ts';

// The list is cached in the module: each test imports a fresh copy.
const load = (): Promise<typeof SavedBoards> => import('./saved-boards.ts');
const KEY = 'ln-ext-saved-boards';
const COLORS = { light: '#f7f8f8', dark: '#123456' };

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(1_000_000);
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('the saved boards', () => {
  it('saves a board under its name, oldest first, and keeps it', async () => {
    const { saveBoard, savedBoards } = await load();
    expect(savedBoards()).toEqual([]);
    const first = saveBoard('Sea', COLORS);
    vi.setSystemTime(2_000_000);
    const second = saveBoard('Moss', { light: '#ffffff', dark: '#2a9f6d' });
    expect(first).toBe('saved-lfls');
    expect(second).toBe('saved-16v7k');
    expect(savedBoards().map(board => board.name)).toEqual(['Sea', 'Moss']);
    expect(JSON.parse(localStorage.getItem(KEY) ?? '')).toEqual([
      { id: 'saved-lfls', name: 'Sea', ...COLORS },
      { id: 'saved-16v7k', name: 'Moss', light: '#ffffff', dark: '#2a9f6d' },
    ]);
    vi.resetModules();
    expect((await load()).savedBoards()).toEqual(savedBoards());
  });

  it('saves no more once the list is full', async () => {
    const { MAX_SAVED_BOARDS, saveBoard, savedBoards } = await load();
    for (let i = 0; i < MAX_SAVED_BOARDS; i++) {
      vi.setSystemTime(1_000_000 + i);
      expect(saveBoard(`Board ${i}`, COLORS)).not.toBeNull();
    }
    expect(saveBoard('One more', COLORS)).toBeNull();
    expect(savedBoards()).toHaveLength(MAX_SAVED_BOARDS);
  });

  it('deletes a board, and tells the lists each time one is saved or deleted', async () => {
    const { deleteBoard, onSavedBoardsChange, saveBoard, savedBoards } = await load();
    const changed = vi.fn<() => void>();
    onSavedBoardsChange(changed);
    const id = saveBoard('Sea', COLORS) ?? '';
    const before = savedBoards();
    deleteBoard(id);
    expect(savedBoards()).toEqual([]);
    expect(savedBoards()).not.toBe(before);
    expect(changed).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(KEY)).toBe('[]');
  });

  it('drops an unreadable list rather than read part of it', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([
        { id: 'saved-a', name: 'Sea', ...COLORS },
        { id: 'other-b', name: 'Moss', ...COLORS },
      ]),
    );
    expect((await load()).savedBoards()).toEqual([]);
  });

  it('reads the list again when another tab changes it', async () => {
    const { onSavedBoardsChange, savedBoards } = await load();
    const changed = vi.fn<() => void>();
    onSavedBoardsChange(changed);
    expect(savedBoards()).toEqual([]);
    const boards = [{ id: 'saved-a', name: 'Sea', ...COLORS }];
    localStorage.setItem(KEY, JSON.stringify(boards));
    window.dispatchEvent(new StorageEvent('storage', { key: 'ln-ext-board' }));
    expect(savedBoards()).toEqual([]);
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    expect(changed).toHaveBeenCalledOnce();
    expect(savedBoards()).toEqual(boards);
    // Read again, the list doesn't listen twice.
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    savedBoards();
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    expect(changed).toHaveBeenCalledTimes(3);
  });
});
