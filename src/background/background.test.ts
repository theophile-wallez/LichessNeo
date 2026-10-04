import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// What the original worker did in the same scenarios.
import legacy from './fixtures/legacy.json' with { type: 'json' };

const CHROME_MANIFEST = {
  manifest_version: 3,
  background: { service_worker: 'background.js' },
  content_scripts: [
    {
      matches: ['https://lichess.org/*'],
      css: ['content.css'],
      js: ['content.js'],
      run_at: 'document_start',
    },
    {
      matches: ['https://lichess.org/*'],
      js: ['page.js'],
      run_at: 'document_start',
      world: 'MAIN',
    },
  ],
};
const FIREFOX_MANIFEST = {
  ...CHROME_MANIFEST,
  background: { scripts: ['background.js', 'extra.js'] },
};

type Listener = (...args: unknown[]) => unknown;

interface Entry {
  readonly event: string;
  readonly [detail: string]: unknown;
}

interface Fake {
  readonly listeners: Record<'installed' | 'startup' | 'message', Listener[]>;
  readonly log: Entry[];
  readonly session: Record<string, unknown>;
}

interface FakeOptions {
  readonly manifest: object;
  /** The files on disk; a missing one fails to fetch. */
  readonly files: Record<string, string | undefined>;
}

function fakeChrome({ manifest, files }: FakeOptions): Fake {
  const fake: Fake = {
    listeners: { installed: [], startup: [], message: [] },
    log: [],
    session: {},
  };
  const runtime = {
    getManifest: () => manifest,
    getURL: (path: string) => `chrome-extension://abc/${path}`,
    onInstalled: { addListener: (listener: Listener) => fake.listeners.installed.push(listener) },
    onStartup: { addListener: (listener: Listener) => fake.listeners.startup.push(listener) },
    onMessage: { addListener: (listener: Listener) => fake.listeners.message.push(listener) },
    reload: () => fake.log.push({ at: Date.now(), event: 'reload' }),
  };
  const storageArea = {
    local: { remove: async (key: string) => fake.log.push({ event: 'local.remove', key }) },
    session: {
      get: async (key: string) => (key in fake.session ? { [key]: fake.session[key] } : {}),
      set: async (items: Record<string, unknown>) => {
        Object.assign(fake.session, items);
        fake.log.push({ event: 'session.set', items });
      },
    },
  };
  vi.stubGlobal('chrome', { runtime, storage: storageArea });
  vi.stubGlobal('fetch', async (url: string, options: unknown) => {
    fake.log.push({ event: 'fetch', url, options });
    const text = files[url.replace('chrome-extension://abc/', '')];
    if (text === undefined) throw new TypeError('Failed to fetch');
    return { text: async () => text };
  });
  return fake;
}

const realSetTimeout = setTimeout;
const pause = (ms: number): Promise<void> => new Promise(resolve => realSetTimeout(resolve, ms));

// crypto.subtle answers from another thread, in real time: wait for what the
// worker is about to do rather than for a fixed delay.
async function until(done: () => boolean): Promise<void> {
  for (let waited = 0; !done(); waited += 5) {
    if (waited > 5000) throw new Error('the worker never answered');
    await pause(5);
  }
}

// For a step that must not produce anything: long enough to see a stray answer.
const settle = (): Promise<void> => pause(30);

async function ask(
  fake: Fake,
  message: unknown,
): Promise<{ kept?: unknown; responses: unknown[] }> {
  const responses: unknown[] = [];
  let kept: unknown;
  for (const listener of fake.listeners.message)
    kept = listener(message, {}, (response: unknown) => responses.push(response));
  // A listener that keeps the channel open answers later.
  if (kept === true) await until(() => responses.length > 0);
  else await settle();
  return kept === undefined ? { responses } : { kept, responses };
}

const count = (fake: Fake): Record<string, number> =>
  Object.fromEntries(Object.entries(fake.listeners).map(([name, list]) => [name, list.length]));

// Every build now listens for pack downloads too (background/packs.ts), which
// the original had none of: one message listener more than it recorded.
const PACK_LISTENERS = 1;

function withPackListener<T extends { readonly listeners: Record<string, number> }>(
  recorded: T,
): T {
  const { message = 0 } = recorded.listeners;
  return { ...recorded, listeners: { ...recorded.listeners, message: message + PACK_LISTENERS } };
}

const files = (): Record<string, string> => ({
  'manifest.json': '{}',
  'background.js': 'bg',
  'content.css': 'css',
  'content.js': 'js',
  'page.js': 'page',
});

async function startWorker(options: FakeOptions): Promise<Fake> {
  const fake = fakeChrome(options);
  // The original told a store install by its update_url; a release build now.
  vi.stubGlobal('CDC_DEV_BUILD', !('update_url' in options.manifest));
  vi.resetModules();
  await import('./index.ts');
  return fake;
}

beforeEach(() => vi.useFakeTimers({ now: 0, toFake: ['setTimeout', 'clearTimeout', 'Date'] }));
afterEach(() => vi.useRealTimers());

describe('the background worker', () => {
  // Every package asks for storage now (the settings live there): the original's store
  // package loaded unpacked, without it, is gone.
  it('store install: only drops the old cache, as the original', async () => {
    const name = 'store install';
    const manifest = { ...CHROME_MANIFEST, update_url: 'https://x' };
    const fake = await startWorker({ manifest, files: files() });
    for (const listener of fake.listeners.installed) await listener({ reason: 'install' });
    const answer = await ask(fake, { type: 'cdc:dev-check' });
    const expected = legacy.scenarios.find(scenario => scenario.name === name);
    expect({ name, listeners: count(fake), answer, log: fake.log }).toEqual(
      expected && withPackListener(expected),
    );
  });

  it('release build: only drops the old cache, even loaded unpacked', async () => {
    const fake = fakeChrome({ manifest: CHROME_MANIFEST, files: files() });
    vi.resetModules();
    await import('./index.ts');
    expect(count(fake)).toEqual({ installed: 1, startup: 0, message: PACK_LISTENERS });
    expect(await ask(fake, { type: 'cdc:dev-check' })).toEqual({ responses: [] });
  });

  it('unpacked: reloads once the files change, as the original', async () => {
    const disk = files();
    const fake = await startWorker({ manifest: CHROME_MANIFEST, files: disk });
    const listeners = count(fake);
    for (const listener of fake.listeners.installed) listener({ reason: 'install' });
    await until(() => fake.session['dev:loaded'] !== undefined);
    const loaded = fake.session['dev:loaded'];
    const steps: unknown[] = [];
    const reloads = (): number => fake.log.filter(entry => entry.event === 'reload').length;
    steps.push({ step: 'other message', ...(await ask(fake, { type: 'other' })) });
    steps.push({ step: 'no message', ...(await ask(fake, undefined)) });
    steps.push({ step: 'unchanged', ...(await ask(fake, { type: 'cdc:dev-check' })) });
    disk['content.js'] = 'js v2';
    steps.push({ step: 'changed', ...(await ask(fake, { type: 'cdc:dev-check' })) });
    vi.advanceTimersByTime(49);
    steps.push({ step: 'reloads after 49 ms', reloads: reloads() });
    vi.advanceTimersByTime(1);
    steps.push({ step: 'reloads after 50 ms', reloads: reloads() });
    steps.push({ step: 'while reloading', ...(await ask(fake, { type: 'cdc:dev-check' })) });
    vi.advanceTimersByTime(100);
    expect({ listeners, loaded, steps, log: fake.log }).toEqual(withPackListener(legacy.unpacked));
  });

  it('unpacked: waits out a build swapping the folder, then reloads', async () => {
    const disk: Record<string, string | undefined> = files();
    const fake = await startWorker({ manifest: CHROME_MANIFEST, files: disk });
    for (const listener of fake.listeners.startup) listener();
    await until(() => fake.session['dev:loaded'] !== undefined);
    const reloads = (): number => fake.log.filter(entry => entry.event === 'reload').length;
    // Half-way through the swap: the manifest is gone, a script has changed.
    disk['manifest.json'] = undefined;
    disk['content.js'] = 'js v2';
    const midSwap = await ask(fake, { type: 'cdc:dev-check' });
    vi.advanceTimersByTime(100);
    expect({ midSwap, reloads: reloads() }).toEqual({
      midSwap: { kept: true, responses: [{ reload: false }] },
      reloads: 0,
    });
    disk['manifest.json'] = '{}';
    const swapped = await ask(fake, { type: 'cdc:dev-check' });
    vi.advanceTimersByTime(100);
    expect({ swapped, reloads: reloads() }).toEqual({
      swapped: { kept: true, responses: [{ reload: true }] },
      reloads: 1,
    });
  });

  it('Firefox: fingerprints its background scripts, a missing file as empty', async () => {
    const fake = await startWorker({ manifest: FIREFOX_MANIFEST, files: files() });
    fake.session['dev:loaded'] = 'stored-before';
    for (const listener of fake.listeners.startup) listener();
    await settle();
    const steps = [
      {
        step: 'stale stored fingerprint',
        ...(await ask(fake, { type: 'cdc:dev-check', extra: 1 })),
      },
    ];
    vi.advanceTimersByTime(100);
    expect({ steps, log: fake.log }).toEqual(legacy.firefox);
  });
});
