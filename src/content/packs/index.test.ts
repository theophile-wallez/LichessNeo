import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod/mini';
import { trackListeners } from '#shared/testing/listeners.ts';
import { flush } from '#shared/testing/timers.ts';
import { fakePack } from '#shared/testing/packs.ts';
import { startPacks } from './index.ts';
import type { Library } from './library.ts';
import { FAMILY_ROWS, OPTION_ROWS } from './options.ts';
import type { Pack } from '#shared/packs/pack.ts';
import type { SoundFiles } from '#shared/protocol.ts';
import { recordedSounds } from './recorded.ts';
import { readPack, readPacks } from './store.ts';

// IndexedDB isn't in happy-dom: the store is the browser's, so it's mocked.
vi.mock('./store.ts', () => ({
  readPack: vi.fn<(id: string) => Promise<Pack | null>>(),
  readPacks: vi.fn<() => Promise<Pack[]>>(() => Promise.resolve([])),
  writePack: vi.fn<(pack: Pack) => Promise<void>>(() => Promise.resolve()),
  deletePack: vi.fn<(id: string) => Promise<void>>(() => Promise.resolve()),
}));

// Boxwood's takes come from the background worker.
vi.mock('./recorded.ts', () => ({
  recordedSounds: vi.fn<() => Promise<SoundFiles>>(() => Promise.resolve({})),
}));

const WOOD = fakePack('ann/packs/main/wood/');
const SentSoundsSchema = z.object({
  sounds: z.record(z.string(), z.array(z.instanceof(ArrayBuffer))),
});
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
  document.getElementById('ln-ext-packs')?.remove();
  delete root.dataset.lnExtBoard;
  delete root.dataset.lnExtLoading;
  delete root.dataset.lnExtBacklit;
});

/** Picks `value` in a settings row, as the user menu's does. */
function choose(
  row: ((library: Library) => HTMLElement) | undefined,
  value: string,
  library: Library,
): void {
  const option = row?.(library).querySelector(`[data-ln-ext-option="${value}"]`);
  if (!(option instanceof HTMLElement)) throw new Error(`no ${value}`);
  option.click();
}

describe('packs', () => {
  it('hides a picked board and set until the packs are read, then shows them', async () => {
    localStorage.setItem('ln-ext-board', WOOD.id);
    localStorage.setItem('ln-ext-pieces', WOOD.id);
    const read = Promise.withResolvers<Pack | null>();
    vi.mocked(readPack).mockReturnValue(read.promise);
    startPacks();
    expect(root.dataset.lnExtLoading).toBe('board pieces');
    read.resolve(WOOD);
    await flush();
    expect(root.dataset.lnExtLoading).toBeUndefined();
    expect(root.dataset.lnExtBoard).toBe('pack');
    expect(document.getElementById('ln-ext-packs')?.textContent).toContain('---white-king:url(');
  });

  it('shows the default if the packs take too long to read, and the pack once they’re in', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    localStorage.setItem('ln-ext-board', WOOD.id);
    const read = Promise.withResolvers<Pack | null>();
    vi.mocked(readPack).mockReturnValue(read.promise);
    startPacks();
    vi.advanceTimersByTime(1999);
    expect(root.dataset.lnExtLoading).toBe('board');
    vi.advanceTimersByTime(1);
    expect(root.dataset.lnExtLoading).toBeUndefined();
    vi.useRealTimers();
    read.resolve(WOOD);
    await flush();
    expect(root.dataset.lnExtBoard).toBe('pack');
  });

  it('shows a board picked in another tab, its pack read first, and that tab’s custom colors', async () => {
    vi.mocked(readPack).mockResolvedValue(WOOD);
    startPacks();
    expect(root.dataset.lnExtBoard).toBe('accent');
    localStorage.setItem('ln-ext-board', WOOD.id);
    window.dispatchEvent(new StorageEvent('storage', { key: 'ln-ext-board' }));
    await flush();
    expect(root.dataset.lnExtBoard).toBe('pack');

    localStorage.setItem('ln-ext-custom-board', '{"light":"#ffffff","dark":"#112233"}');
    window.dispatchEvent(new StorageEvent('storage', { key: 'ln-ext-custom-board' }));
    expect(root.style.getPropertyValue('--ln-ext-board-custom-dark')).toBe('#112233');
    root.style.removeProperty('--ln-ext-board-custom-light');
    root.style.removeProperty('--ln-ext-board-custom-dark');
  });

  it('hides nothing and shows our board at once while no pack is picked', () => {
    vi.mocked(readPack).mockResolvedValue(WOOD);
    startPacks();
    expect(root.dataset.lnExtLoading).toBeUndefined();
    expect(root.dataset.lnExtBoard).toBe('accent');
    expect(document.getElementById('ln-ext-packs')).toBeNull();
  });

  it('leaves the board to Lichess when its own is picked', () => {
    localStorage.setItem('ln-ext-board', 'lichess');
    startPacks();
    expect(root.dataset.lnExtBoard).toBeUndefined();
  });

  it('shows the default when the packs can’t be read', async () => {
    localStorage.setItem('ln-ext-board', WOOD.id);
    vi.mocked(readPack).mockRejectedValue(new Error('blocked'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    startPacks();
    await flush();
    expect(root.dataset.lnExtLoading).toBeUndefined();
    expect(root.dataset.lnExtBoard).toBe('accent');
    expect(error).toHaveBeenCalledWith(
      '[LichessNeo] the imported packs could not be read',
      expect.any(Error),
    );
  });

  it('sends the picked sounds once read, and again when the page script asks', async () => {
    localStorage.setItem('ln-ext-sounds', WOOD.id);
    vi.mocked(readPack).mockResolvedValue(WOOD);
    startPacks();
    // Lichess's until the pack is read.
    expect(posted()).toEqual([{ type: 'ln-ext:sounds', sounds: {} }]);
    await flush();
    const sent = posted().at(-1);
    expect(sent).toMatchObject({ type: 'ln-ext:sounds' });
    expect(Object.keys(SentSoundsSchema.parse(sent).sounds)).toEqual(['capture']);
    window.dispatchEvent(
      new MessageEvent('message', { data: { type: 'ln-ext:page-ready' }, source: window }),
    );
    expect(posted().slice(1)).toEqual([sent, sent]);
  });

  it('sends the sounds again when the picked pack is imported anew', async () => {
    localStorage.setItem('ln-ext-sounds', WOOD.id);
    vi.mocked(readPack).mockResolvedValue(WOOD);
    const library = startPacks();
    await library.ready;
    await library.loadAll();
    vi.mocked(window.postMessage).mockClear();
    await library.add(
      [
        {
          ...WOOD,
          sounds: { capture: WOOD.sounds?.capture ?? '', notify: WOOD.sounds?.capture ?? '' },
        },
      ],
      WOOD.id,
    );
    const [sent] = posted();
    expect(Object.keys(SentSoundsSchema.parse(sent).sounds)).toEqual(['capture', 'notify']);
  });

  it('reads only the picked packs as the page starts, each once', async () => {
    localStorage.setItem('ln-ext-board', WOOD.id);
    localStorage.setItem('ln-ext-pieces', WOOD.id);
    vi.mocked(readPack).mockResolvedValue(WOOD);
    await startPacks().ready;
    expect(vi.mocked(readPack).mock.calls).toEqual([[WOOD.id]]);
    expect(readPacks).not.toHaveBeenCalled();
  });

  it('sends the extension’s sound set with its placement, again as that changes, until left', async () => {
    localStorage.setItem('ln-ext-sounds', 'foley');
    localStorage.setItem('ln-ext-sound-place', 'stereo');
    const library = startPacks();
    await library.ready;
    expect(posted()).toEqual([{ type: 'ln-ext:sounds', sounds: {}, synth: { place: 'stereo' } }]);
    choose(OPTION_ROWS.sound[0], 'none', library);
    expect(posted().at(-1)).toEqual({
      type: 'ln-ext:sounds',
      sounds: {},
      synth: { place: 'none' },
    });
    library.choose('sound', 'lichess');
    expect(posted().at(-1)).toEqual({ type: 'ln-ext:sounds', sounds: {} });
    choose(OPTION_ROWS.sound[0], 'space', library);
    expect(posted()).toHaveLength(3);
  });

  it('sends Boxwood’s takes once read, unless another set was picked meanwhile', async () => {
    const takes = { capture: [new ArrayBuffer(1), new ArrayBuffer(2)] };
    const read = Promise.withResolvers<SoundFiles>();
    vi.mocked(recordedSounds).mockReturnValue(read.promise);
    localStorage.setItem('ln-ext-sounds', 'boxwood');
    const library = startPacks();
    await library.ready;
    expect(posted()).toEqual([]);
    read.resolve(takes);
    await flush();
    expect(posted()).toEqual([{ type: 'ln-ext:sounds', sounds: takes }]);
    const slow = Promise.withResolvers<SoundFiles>();
    vi.mocked(recordedSounds).mockReturnValue(slow.promise);
    library.choose('sound', 'lichess');
    library.choose('sound', 'boxwood');
    library.choose('sound', 'foley');
    slow.resolve(takes);
    await flush();
    expect(posted().slice(1)).toEqual([
      { type: 'ln-ext:sounds', sounds: {} },
      { type: 'ln-ext:sounds', sounds: {}, synth: { place: 'space' } },
    ]);
  });

  it('puts the backlit settings on <html> only while a backlit board shows', async () => {
    localStorage.setItem('ln-ext-board', 'backlit-walnut');
    localStorage.setItem('ln-ext-backlit-waves', 'always');
    const library = startPacks();
    await library.ready;
    expect(root.dataset.lnExtBacklit).toBe('accent short always 5.5 9.6');
    choose(FAMILY_ROWS.backlit?.[0], 'sides', library);
    expect(root.dataset.lnExtBacklit).toBe('sides short always 5.5 9.6');
    const gap = FAMILY_ROWS.backlit?.[3]?.().querySelector('input');
    if (!gap) throw new Error('no gap slider');
    gap.value = '2';
    gap.dispatchEvent(new Event('input'));
    expect(root.dataset.lnExtBacklit).toBe('sides short always 2 9.6');
    expect(localStorage.getItem('ln-ext-backlit-gap')).toBe('2');
    library.choose('board', 'accent');
    expect(root.dataset.lnExtBacklit).toBeUndefined();
    choose(FAMILY_ROWS.backlit?.[1], 'wide', library);
    expect(root.dataset.lnExtBacklit).toBeUndefined();
  });
});
