import { afterEach, describe, expect, it, vi } from 'vitest';
import { RECORDED_TAKES, RecordedSoundsResponseSchema } from '#shared/recorded-sounds.ts';

type Listener = (message: unknown, sender: unknown, respond: (answer: unknown) => void) => unknown;

const none: Listener = () => false;

const OGG = new Uint8Array([0x4f, 0x67, 0x67, 0x53]);

// A fresh worker's listener, its files served by `fetch` from their extension URL.
async function serve(fetch: (url: string) => Promise<Response>): Promise<Listener> {
  let listener = none;
  vi.stubGlobal('fetch', fetch);
  vi.stubGlobal('chrome', {
    runtime: {
      getURL: (path: string) => `chrome-extension://id/${path}`,
      onMessage: { addListener: (added: Listener) => (listener = added) },
    },
  });
  const { serveRecordedSounds } = await import('./recorded-sounds.ts');
  serveRecordedSounds();
  return listener;
}

async function ask(listener: Listener): Promise<unknown> {
  const respond = vi.fn<(answer: unknown) => void>();
  expect(listener({ type: 'ln-ext:recorded-sounds' }, {}, respond)).toBe(true);
  await vi.waitFor(() => expect(respond).toHaveBeenCalledOnce());
  return respond.mock.calls[0]?.[0];
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('serveRecordedSounds', () => {
  it('answers with every take as a data: URL, read once', async () => {
    const fetch = vi.fn<(url: string) => Promise<Response>>(() =>
      Promise.resolve(new Response(OGG)),
    );
    const listener = await serve(fetch);
    const answer = await ask(listener);
    expect(answer).toMatchObject({
      sounds: { castle: Array.from({ length: 4 }, () => 'data:audio/ogg;base64,T2dnUw==') },
    });
    expect(fetch).toHaveBeenCalledWith('chrome-extension://id/sounds/boxwood/castle-1.ogg');
    const count = Object.values(RECORDED_TAKES).reduce((sum, takes) => sum + takes, 0);
    expect(fetch).toHaveBeenCalledTimes(count);
    await ask(listener);
    expect(fetch).toHaveBeenCalledTimes(count);
  });

  it('answers with none when a take can’t be read, and reads them again next time', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let found = false;
    const listener = await serve(() =>
      Promise.resolve(new Response(OGG, { status: found ? 200 : 404 })),
    );
    expect(await ask(listener)).toEqual({ sounds: {} });
    found = true;
    const answer = await ask(listener);
    expect(Object.keys(RecordedSoundsResponseSchema.parse(answer).sounds).toSorted()).toEqual(
      Object.keys(RECORDED_TAKES).toSorted(),
    );
  });

  it('leaves other messages to other listeners', async () => {
    const respond = vi.fn<(answer: unknown) => void>();
    expect((await serve(fetch))({ type: 'ln-ext:download-pack' }, {}, respond)).toBeUndefined();
    expect(respond).not.toHaveBeenCalled();
  });
});
