import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { fakePack, listedPack } from '#shared/testing/packs.ts';
import { createLibrary, LICHESS, storedPick, type Look, type Shown } from './library.ts';
import type { Pack } from '#shared/packs/pack.ts';
import { ACCENT_BOARD } from './themes.ts';

const WOOD = fakePack('ann/packs/main/wood/');
const CLICKS = fakePack('ann/packs/main/clicks/', ['sound']);
// The boards a pack.json lists, beside its lone pieces.
const SET = 'ann/packs/main/set/';
const LONE = fakePack(SET, ['piece']);
const LIGHT = listedPack(SET, 'board', 'Light');
const DARK = listedPack(SET, 'board', 'Dark');

type Save = (pack: Pack) => Promise<void>;
type Erase = (id: string) => Promise<void>;

async function library(
  packs: readonly Pack[],
  stored: readonly Pack[] = packs,
): Promise<{
  readonly shown: Shown[];
  readonly readAll: Mock<() => Promise<readonly Pack[]>>;
  readonly save: Mock<Save>;
  readonly erase: Mock<Erase>;
  readonly library: ReturnType<typeof createLibrary>;
}> {
  const shown: Shown[] = [];
  const save = vi.fn<Save>(() => Promise.resolve());
  const erase = vi.fn<Erase>(() => Promise.resolve());
  const readAll = vi.fn<() => Promise<readonly Pack[]>>(() => Promise.resolve(stored));
  const created = createLibrary({
    readPicked: () => Promise.resolve(packs),
    readAll,
    save,
    erase,
    show: next => shown.push(next),
  });
  await created.ready;
  return { shown, readAll, save, erase, library: created };
}

const idOf = (look: Look | undefined): string | null =>
  typeof look === 'string' ? look : (look?.id ?? null);

const ids = (shown: Shown | undefined): Record<string, string | null> => ({
  board: idOf(shown?.board),
  piece: idOf(shown?.piece),
  sound: idOf(shown?.sound),
});

const erased = (erase: Mock<Erase>): Set<string> => new Set(erase.mock.calls.map(([id]) => id));

afterEach(() => {
  localStorage.clear();
});

describe('storedPick', () => {
  it('reads a pack’s id, a theme’s or Lichess’s, and anything older or missing as the default', () => {
    expect([storedPick('board'), storedPick('piece'), storedPick('sound')]).toEqual([
      ACCENT_BOARD,
      LICHESS,
      LICHESS,
    ]);
    localStorage.setItem('ln-ext-board', WOOD.id);
    // An older version's bundled sets and boards: they're gone.
    localStorage.setItem('ln-ext-pieces', 'neo');
    localStorage.setItem('ln-ext-sounds', 'lichess');
    expect([storedPick('board'), storedPick('piece'), storedPick('sound')]).toEqual([
      WOOD.id,
      LICHESS,
      LICHESS,
    ]);
    localStorage.setItem('ln-ext-board', 'brown');
    expect(storedPick('board')).toBe(ACCENT_BOARD);
    localStorage.setItem('ln-ext-board', LICHESS);
    expect(storedPick('board')).toBe(LICHESS);
    // Our blue board became the accent's.
    localStorage.setItem('ln-ext-board', 'blue');
    expect(storedPick('board')).toBe(ACCENT_BOARD);
  });
});

describe('createLibrary', () => {
  it('shows the defaults until something is picked, then the pick', async () => {
    const { shown, library: packs } = await library([WOOD, CLICKS]);
    expect(ids(shown.at(-1))).toEqual({ board: ACCENT_BOARD, piece: null, sound: null });
    packs.choose('piece', WOOD.id);
    packs.choose('sound', CLICKS.id);
    expect(ids(shown.at(-1))).toEqual({ board: ACCENT_BOARD, piece: WOOD.id, sound: CLICKS.id });
    expect(localStorage.getItem('ln-ext-pieces')).toBe(WOOD.id);
    expect([packs.current('board'), packs.current('piece')]).toEqual([ACCENT_BOARD, WOOD.id]);
    packs.choose('piece', LICHESS);
    packs.choose('board', LICHESS);
    expect(ids(shown.at(-1))).toEqual({ board: null, piece: null, sound: CLICKS.id });
  });

  it('shows a hovered look a moment, unsaved, and the pick again after', async () => {
    const { shown, library: packs } = await library([WOOD, CLICKS]);
    packs.preview('board', WOOD.id);
    expect(ids(shown.at(-1))).toEqual({ board: WOOD.id, piece: null, sound: null });
    expect(packs.current('board')).toBe(ACCENT_BOARD);
    expect(localStorage.getItem('ln-ext-board')).toBeNull();
    // Still shown as the pieces are picked, until the pointer leaves.
    packs.choose('piece', WOOD.id);
    expect(ids(shown.at(-1))).toEqual({ board: WOOD.id, piece: WOOD.id, sound: null });
    packs.preview('board', null);
    expect(ids(shown.at(-1))).toEqual({ board: ACCENT_BOARD, piece: WOOD.id, sound: null });
    // A pack without the part shows the pick.
    packs.preview('board', CLICKS.id);
    expect(ids(shown.at(-1)).board).toBe(ACCENT_BOARD);
    packs.preview('board', LICHESS);
    expect(ids(shown.at(-1)).board).toBeNull();
  });

  it('shows the default for a pick whose pack is gone or lacks the part', async () => {
    localStorage.setItem('ln-ext-board', CLICKS.id);
    localStorage.setItem('ln-ext-pieces', 'ann/packs/main/gone/');
    const { shown, library: packs } = await library([WOOD, CLICKS]);
    expect(ids(shown.at(-1))).toEqual({ board: ACCENT_BOARD, piece: null, sound: null });
    expect(packs.current('board')).toBe(ACCENT_BOARD);
    // The pick is kept: a pack that failed to read this time may read the next.
    expect(localStorage.getItem('ln-ext-pieces')).toBe('ann/packs/main/gone/');
  });

  it('stores an imported pack and shows each part it has', async () => {
    localStorage.setItem('ln-ext-board', WOOD.id);
    const { shown, save, library: packs } = await library([WOOD]);
    await packs.loadAll();
    const listener = vi.fn<() => void>();
    packs.onChange(listener);
    await packs.add([CLICKS], CLICKS.id);
    expect(save).toHaveBeenCalledWith(CLICKS);
    expect(ids(shown.at(-1))).toEqual({ board: WOOD.id, piece: null, sound: CLICKS.id });
    expect(packs.packs()).toEqual([WOOD, CLICKS]);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('replaces a pack imported again, keeping one of each', async () => {
    const { library: packs } = await library([WOOD, CLICKS]);
    const renamed = { ...WOOD, name: 'Wood, again' };
    await packs.add([renamed], renamed.id);
    expect(packs.packs()).toEqual([CLICKS, renamed]);
  });

  it('removes a pack, and the parts it showed go back to their default', async () => {
    const { shown, erase, library: packs } = await library([WOOD]);
    packs.choose('board', WOOD.id);
    packs.choose('piece', WOOD.id);
    await packs.remove(WOOD.id);
    expect(erase).toHaveBeenCalledWith(WOOD.id);
    expect(packs.packs()).toEqual([]);
    expect(ids(shown.at(-1))).toEqual({ board: ACCENT_BOARD, piece: null, sound: null });
    expect(localStorage.getItem('ln-ext-board')).toBe(ACCENT_BOARD);
    expect(localStorage.getItem('ln-ext-pieces')).toBe(LICHESS);
  });

  it('drops what a pack.json no longer lists, and shows its first of each part', async () => {
    const { shown, save, erase, library: packs } = await library([CLICKS, LONE, LIGHT, DARK]);
    packs.choose('board', DARK.id);
    packs.choose('sound', CLICKS.id);
    const light = { ...LIGHT, name: 'Light, again' };
    await packs.add([light], SET);
    expect(save.mock.calls).toEqual([[light]]);
    expect(erased(erase)).toEqual(new Set([DARK.id, LONE.id]));
    expect(packs.packs()).toEqual([CLICKS, light]);
    expect(ids(shown.at(-1))).toEqual({ board: LIGHT.id, piece: null, sound: CLICKS.id });
  });

  it('sends a part back to its default when its pick is dropped', async () => {
    const { library: packs } = await library([LONE, DARK]);
    packs.choose('board', DARK.id);
    await packs.add([LONE], SET);
    expect(localStorage.getItem('ln-ext-board')).toBe(ACCENT_BOARD);
    expect(packs.current('piece')).toBe(LONE.id);
  });

  it('removes every pack a pack.json gave, and those of no other', async () => {
    const { erase, library: packs } = await library([CLICKS, LONE, LIGHT]);
    await packs.remove(SET);
    expect(erased(erase)).toEqual(new Set([LIGHT.id, LONE.id]));
    expect(packs.packs()).toEqual([CLICKS]);
  });

  it('changes nothing when the store fails', async () => {
    const { save, library: packs } = await library([]);
    save.mockRejectedValueOnce(new Error('quota'));
    await expect(packs.add([WOOD], WOOD.id)).rejects.toThrow('quota');
    expect(packs.packs()).toEqual([]);
    expect(localStorage.getItem('ln-ext-board')).toBeNull();
  });

  it('reads the other packs once, keeping those already shown as they are', async () => {
    localStorage.setItem('ln-ext-sounds', CLICKS.id);
    const { shown, readAll, library: packs } = await library([CLICKS], [WOOD, { ...CLICKS }]);
    expect(packs.packs()).toEqual([CLICKS]);
    await Promise.all([packs.loadAll(), packs.loadAll()]);
    await packs.loadAll();
    expect(readAll).toHaveBeenCalledOnce();
    expect(packs.packs().map(pack => pack.id)).toEqual([WOOD.id, CLICKS.id]);
    // The same object: a new one would send its sounds to the page again.
    expect(shown.at(-1)?.sound).toBe(CLICKS);
  });
});
