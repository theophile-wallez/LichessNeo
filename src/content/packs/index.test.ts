import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod/mini';
import { trackListeners } from '#shared/testing/listeners.ts';
import { flush } from '#shared/testing/timers.ts';
import { fakePack } from '#shared/testing/packs.ts';
import { startPacks } from './index.ts';
import type { Pack } from '#shared/packs/pack.ts';
import { readPack, readPacks } from './store.ts';

// IndexedDB isn't in happy-dom: the store is the browser's (tests/e2e/packs.spec.ts).
vi.mock('./store.ts', () => ({
  readPack: vi.fn<(id: string) => Promise<Pack | null>>(),
  readPacks: vi.fn<() => Promise<Pack[]>>(() => Promise.resolve([])),
  writePack: vi.fn<(pack: Pack) => Promise<void>>(() => Promise.resolve()),
  deletePack: vi.fn<(id: string) => Promise<void>>(() => Promise.resolve()),
}));

const WOOD = fakePack('ann/packs/main/wood/');
const SentSoundsSchema = z.object({ sounds: z.record(z.string(), z.instanceof(ArrayBuffer)) });
const root = document.documentElement;
let stopListeners: () => void;

const posted = (): unknown[] =>
  vi.mocked(window.postMessage).mock.calls.map(([message]): unknown => message);

beforeEach(() => {
  stopListeners = trackListeners(window, document);
  vi.spyOn(window, 'postMessage').mockImplementation(() => {});
});

afterEach(() => {
  stopListeners();
  vi.restoreAllMocks();
  localStorage.clear();
  document.getElementById('cdc-packs')?.remove();
  delete root.dataset.cdcBoard;
  delete root.dataset.cdcLoading;
});

describe('packs', () => {
  it('hides a picked board and set until the packs are read, then shows them', async () => {
    localStorage.setItem('cdc-board', WOOD.id);
    localStorage.setItem('cdc-pieces', WOOD.id);
    const read = Promise.withResolvers<Pack | null>();
    vi.mocked(readPack).mockReturnValue(read.promise);
    startPacks();
    expect(root.dataset.cdcLoading).toBe('board pieces');
    read.resolve(WOOD);
    await flush();
    expect(root.dataset.cdcLoading).toBeUndefined();
    expect(root.dataset.cdcBoard).toBe('pack');
    expect(document.getElementById('cdc-packs')?.textContent).toContain('---white-king:url(');
  });

  it('shows the default if the packs take too long to read, and the pack once they’re in', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    localStorage.setItem('cdc-board', WOOD.id);
    const read = Promise.withResolvers<Pack | null>();
    vi.mocked(readPack).mockReturnValue(read.promise);
    startPacks();
    vi.advanceTimersByTime(1999);
    expect(root.dataset.cdcLoading).toBe('board');
    vi.advanceTimersByTime(1);
    expect(root.dataset.cdcLoading).toBeUndefined();
    vi.useRealTimers();
    read.resolve(WOOD);
    await flush();
    expect(root.dataset.cdcBoard).toBe('pack');
  });

  it('hides nothing and shows our board at once while no pack is picked', () => {
    vi.mocked(readPack).mockResolvedValue(WOOD);
    startPacks();
    expect(root.dataset.cdcLoading).toBeUndefined();
    expect(root.dataset.cdcBoard).toBe('blue');
    expect(document.getElementById('cdc-packs')).toBeNull();
  });

  it('leaves the board to Lichess when its own is picked', () => {
    localStorage.setItem('cdc-board', 'lichess');
    startPacks();
    expect(root.dataset.cdcBoard).toBeUndefined();
  });

  it('shows the default when the packs can’t be read', async () => {
    localStorage.setItem('cdc-board', WOOD.id);
    vi.mocked(readPack).mockRejectedValue(new Error('blocked'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    startPacks();
    await flush();
    expect(root.dataset.cdcLoading).toBeUndefined();
    expect(root.dataset.cdcBoard).toBe('blue');
    expect(error).toHaveBeenCalledWith(
      '[LichessReimagined] the imported packs could not be read',
      expect.any(Error),
    );
  });

  it('sends the picked sounds once read, and again when the page script asks', async () => {
    localStorage.setItem('cdc-sounds', WOOD.id);
    vi.mocked(readPack).mockResolvedValue(WOOD);
    startPacks();
    // Lichess's until the pack is read.
    expect(posted()).toEqual([{ type: 'cdc:sounds', sounds: {} }]);
    await flush();
    const sent = posted().at(-1);
    expect(sent).toMatchObject({ type: 'cdc:sounds' });
    expect(Object.keys(SentSoundsSchema.parse(sent).sounds)).toEqual(['capture']);
    window.dispatchEvent(
      new MessageEvent('message', { data: { type: 'cdc:page-ready' }, source: window }),
    );
    expect(posted().slice(1)).toEqual([sent, sent]);
  });

  it('sends the sounds again when the picked pack is imported anew', async () => {
    localStorage.setItem('cdc-sounds', WOOD.id);
    vi.mocked(readPack).mockResolvedValue(WOOD);
    const library = startPacks();
    await library.ready;
    vi.mocked(window.postMessage).mockClear();
    await library.add({
      ...WOOD,
      sounds: { capture: WOOD.sounds?.capture ?? '', notify: WOOD.sounds?.capture ?? '' },
    });
    const [sent] = posted();
    expect(Object.keys(SentSoundsSchema.parse(sent).sounds)).toEqual(['capture', 'notify']);
  });

  it('reads only the picked packs as the page starts, each once', async () => {
    localStorage.setItem('cdc-board', WOOD.id);
    localStorage.setItem('cdc-pieces', WOOD.id);
    vi.mocked(readPack).mockResolvedValue(WOOD);
    await startPacks().ready;
    expect(vi.mocked(readPack).mock.calls).toEqual([[WOOD.id]]);
    expect(readPacks).not.toHaveBeenCalled();
  });
});
