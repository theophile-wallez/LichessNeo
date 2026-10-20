import { afterEach, describe, expect, it, vi } from 'vitest';
import type { recordedSounds as RecordedSounds } from './recorded.ts';

const sendMessage = vi.fn<(message: unknown) => Promise<unknown>>();

// A fresh content script's, asking a worker that answers with `sendMessage`.
async function recordedSounds(): Promise<typeof RecordedSounds> {
  vi.stubGlobal('chrome', { runtime: { sendMessage } });
  return (await import('./recorded.ts')).recordedSounds;
}

const bytes = (takes: readonly ArrayBuffer[] | undefined): number[][] | undefined =>
  takes?.map(take => [...new Uint8Array(take)]);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  sendMessage.mockReset();
});

describe('recordedSounds', () => {
  it('asks the worker once, and gives each sound’s takes as bytes', async () => {
    sendMessage.mockResolvedValue({
      sounds: { castle: ['data:audio/ogg;base64,AQI=', 'data:audio/ogg;base64,Aw=='] },
    });
    const read = await recordedSounds();
    const files = await read();
    expect(sendMessage.mock.calls).toEqual([[{ type: 'ln-ext:recorded-sounds' }]]);
    expect(Object.keys(files)).toEqual(['castle']);
    expect(bytes(files.castle)).toEqual([[1, 2], [3]]);
    expect(await read()).toBe(files);
    expect(sendMessage).toHaveBeenCalledOnce();
  });

  it('gives none for an answer it can’t read, and asks again next time', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    sendMessage.mockResolvedValueOnce({ sounds: { castle: ['https://example.com/a.ogg'] } });
    const read = await recordedSounds();
    expect(await read()).toEqual({});
    sendMessage.mockResolvedValueOnce({ sounds: {} });
    await read();
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });
});
