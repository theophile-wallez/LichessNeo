import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeGithub } from '#shared/testing/github.ts';
import { servePackDownloads } from './packs.ts';

type Listener = (message: unknown, sender: unknown, respond: (answer: unknown) => void) => unknown;

const none: Listener = () => false;

const getPlatformInfo = vi.fn<() => Promise<object>>(() => Promise.resolve({}));

function serve(): Listener {
  let listener = none;
  vi.stubGlobal('chrome', {
    runtime: {
      getPlatformInfo,
      onMessage: { addListener: (added: Listener) => (listener = added) },
    },
  });
  servePackDownloads();
  return listener;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('servePackDownloads', () => {
  it('reads the pack.json asked for, and answers with it', async () => {
    const files = new Map([
      ['pack.json', new TextEncoder().encode('{"name":"S","sounds":{"capture":"c.mp3"}}')],
    ]);
    fakeGithub({ repo: 'ann/packs', files });
    const respond = vi.fn<(answer: unknown) => void>();
    const message = {
      type: 'ln-ext:pack-manifest',
      link: 'https://github.com/ann/packs',
      token: '',
    };
    expect(serve()(message, {}, respond)).toBe(true);
    await vi.waitFor(() => expect(respond).toHaveBeenCalledOnce());
    expect(respond.mock.calls[0]?.[0]).toEqual({
      source: 'ann/packs/HEAD/',
      manifest: { name: 'S', sounds: { capture: 'c.mp3' } },
    });
  });

  it('reads a file asked for, and answers with it', async () => {
    const files = new Map([['c.mp3', new Uint8Array([0x49, 0x44, 0x33, 4])]]);
    fakeGithub({ repo: 'ann/packs', files });
    const respond = vi.fn<(answer: unknown) => void>();
    const message = {
      type: 'ln-ext:pack-file',
      link: 'https://github.com/ann/packs',
      token: '',
      path: 'c.mp3',
      kind: 'sound',
    };
    expect(serve()(message, {}, respond)).toBe(true);
    await vi.waitFor(() => expect(respond).toHaveBeenCalledOnce());
    expect(respond.mock.calls[0]?.[0]).toEqual({ url: 'data:audio/mpeg;base64,SUQzBA==' });
  });

  it('leaves other messages to other listeners', () => {
    const respond = vi.fn<(answer: unknown) => void>();
    expect(serve()({ type: 'ln-ext:dev-check' }, {}, respond)).toBeUndefined();
    expect(respond).not.toHaveBeenCalled();
  });

  it('keeps itself awake while a download runs, and no longer', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const answered = Promise.withResolvers<Response>();
    vi.stubGlobal('fetch', () => answered.promise);
    const respond = vi.fn<(answer: unknown) => void>();
    const message = {
      type: 'ln-ext:pack-manifest',
      link: 'https://github.com/ann/packs',
      token: '',
    };
    serve()(message, {}, respond);
    vi.advanceTimersByTime(45_000);
    expect(getPlatformInfo).toHaveBeenCalledTimes(2);
    answered.resolve(new Response('{"name":"x"}'));
    await vi.waitFor(() => expect(respond).toHaveBeenCalledOnce());
    vi.advanceTimersByTime(60_000);
    expect(getPlatformInfo).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
