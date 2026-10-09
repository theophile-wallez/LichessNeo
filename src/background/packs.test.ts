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
  it('downloads the pack asked for, and answers with it', async () => {
    const files = new Map([
      ['pack.json', new TextEncoder().encode('{"name":"S","sounds":{"capture":"c.mp3"}}')],
      ['c.mp3', new Uint8Array([0x49, 0x44, 0x33, 4])],
    ]);
    fakeGithub({ repo: 'ann/packs', files });
    const respond = vi.fn<(answer: unknown) => void>();
    const message = {
      type: 'lr-ext:download-pack',
      link: 'https://github.com/ann/packs',
      token: '',
    };
    expect(serve()(message, {}, respond)).toBe(true);
    await vi.waitFor(() => expect(respond).toHaveBeenCalledOnce());
    expect(respond.mock.calls[0]?.[0]).toMatchObject({
      pack: { name: 'S', id: 'ann/packs/HEAD/' },
    });
  });

  it('leaves other messages to other listeners', () => {
    const respond = vi.fn<(answer: unknown) => void>();
    expect(serve()({ type: 'lr-ext:dev-check' }, {}, respond)).toBeUndefined();
    expect(respond).not.toHaveBeenCalled();
  });

  it('keeps itself awake while a download runs, and no longer', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const answered = Promise.withResolvers<Response>();
    vi.stubGlobal('fetch', () => answered.promise);
    const respond = vi.fn<(answer: unknown) => void>();
    const message = {
      type: 'lr-ext:download-pack',
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
