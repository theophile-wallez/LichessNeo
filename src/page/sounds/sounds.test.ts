import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SoundPlayer } from '#page/lichess/sound.ts';
import { fakeSoundPlayer } from './fixtures/sound-player.ts';
import { sounds } from './index.ts';
import type { SoundName } from '#shared/sounds.ts';
import { replaceSounds, whenSoundPlayerReady } from './install.ts';

const post = (data: unknown): void => {
  window.dispatchEvent(new MessageEvent('message', { data, source: window }));
};

function stubBlobUrls(): { readonly blobs: unknown[] } {
  const blobs: unknown[] = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
    blobs.push(blob);
    return `blob:sound-${blobs.length}`;
  });
  return { blobs };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(window, 'site');
});

describe('replaceSounds', () => {
  it('makes a blob of each sound it is given, in place of the ones before', () => {
    const { blobs } = stubBlobUrls();
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const urls = new Map<SoundName, string>();
    replaceSounds(urls, { capture: new ArrayBuffer(4), castle: new ArrayBuffer(2) });
    expect([...urls]).toEqual([
      ['capture', 'blob:sound-1'],
      ['castle', 'blob:sound-2'],
    ]);
    expect(blobs.map(blob => blob instanceof Blob && blob.size)).toEqual([4, 2]);
    replaceSounds(urls, { notify: new ArrayBuffer(1) });
    expect(revoke.mock.calls).toEqual([['blob:sound-1'], ['blob:sound-2']]);
    expect([...urls]).toEqual([['notify', 'blob:sound-3']]);
  });
});

describe('whenSoundPlayerReady', () => {
  it('waits for Lichess to set its player up', async () => {
    const ready = vi.fn<(sound: SoundPlayer) => void>();
    whenSoundPlayerReady(ready);
    await vi.advanceTimersByTimeAsync(120);
    expect(ready).not.toHaveBeenCalled();
    const { sound } = fakeSoundPlayer();
    Object.assign(window, { site: { sound } });
    await vi.advanceTimersByTimeAsync(50);
    expect(ready).toHaveBeenCalledWith(sound);
  });

  it('gives up after 30 seconds', async () => {
    const ready = vi.fn<(sound: SoundPlayer) => void>();
    whenSoundPlayerReady(ready);
    await vi.advanceTimersByTimeAsync(30_050);
    Object.assign(window, { site: { sound: fakeSoundPlayer().sound } });
    await vi.advanceTimersByTimeAsync(1000);
    expect(ready).not.toHaveBeenCalled();
  });
});

function startHooked(): ReturnType<typeof fakeSoundPlayer> {
  stubBlobUrls();
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(window, 'postMessage').mockImplementation(() => {});
  const player = fakeSoundPlayer();
  Object.assign(window, { site: { sound: player.sound } });
  sounds.start();
  return player;
}

describe('sounds', () => {
  it('asks for the sounds, then hooks Lichess’s player once some are posted', () => {
    const { sound, calls } = startHooked();
    expect(window.postMessage).toHaveBeenCalledWith({ type: 'lr-ext:page-ready' }, location.origin);
    post({ type: 'lr-ext:sounds', sounds: {} });
    expect(sound.lrExtHooked).toBeUndefined();
    post({ type: 'lr-ext:sounds', sounds: { capture: new ArrayBuffer(1) } });
    expect([...sound.paths.keys()]).toEqual(['lr-ext-capture']);
    expect(sound.lrExtHooked).toBe(true);
    sound.play('capture');
    sound.play('berserk');
    expect(calls).toEqual([
      ['play', 'lr-ext-capture', 1],
      ['play', 'berserk', 1],
    ]);
  });

  it('plays the sounds of each new pick, and Lichess’s own once none are left', () => {
    const { sound, calls } = startHooked();
    post({ type: 'lr-ext:sounds', sounds: { capture: new ArrayBuffer(1) } });
    post({ type: 'lr-ext:sounds', sounds: { castle: new ArrayBuffer(1) } });
    expect([...sound.paths.keys()]).toEqual(['lr-ext-castle']);
    post({ type: 'lr-ext:sounds', sounds: {} });
    expect([...sound.paths]).toEqual([]);
    sound.play('capture');
    sound.move({ name: 'move' });
    expect(calls).toEqual([
      ['play', 'capture', 1],
      ['move', { name: 'move' }],
    ]);
  });
});
