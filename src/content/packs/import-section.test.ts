import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { fakeGithub } from '#shared/testing/github.ts';
import { fakePack } from '#shared/testing/packs.ts';
import { flush } from '#shared/testing/timers.ts';
import { fakeWorker } from '#shared/testing/worker.ts';
import type { Pack } from '#shared/packs/pack.ts';
import { importSection } from './import-section.ts';
import { createLibrary, type Library } from './library.ts';

const WOOD = fakePack('ann/packs/main/wood/');
const CLICKS = fakePack('ann/packs/main/clicks/', ['sound']);

async function start(
  packs: readonly Pack[],
  readAll = (): Promise<readonly Pack[]> => Promise.resolve(packs),
): Promise<{ readonly library: Library; readonly section: HTMLElement }> {
  const library = createLibrary({
    readPicked: () => Promise.resolve([]),
    readAll,
    save: () => Promise.resolve(),
    erase: () => Promise.resolve(),
    show: () => undefined,
  });
  await library.ready;
  const section = importSection(library);
  document.body.append(section);
  await library.loadAll();
  return { library, section };
}

const names = (section: HTMLElement): (string | null)[] =>
  queryAll(section, '.ln-ext-pack__name', HTMLElement).map(name => name.textContent);
const status = (section: HTMLElement): string | null | undefined =>
  section.querySelector('.ln-ext-packs__status')?.textContent;

function submit(section: HTMLElement, link: string, token = ''): void {
  const [input, secret] = queryAll(section, '.ln-ext-packs__import input', HTMLInputElement);
  if (!input || !secret) throw new Error('no form');
  input.value = link;
  secret.value = token;
  queryOne(section, '.ln-ext-packs__row button', HTMLButtonElement)?.click();
}

// Each message as its name, then what fills it in.
const getMessage = (name: string, substitutions: readonly string[] = []): string =>
  [name, ...substitutions].join(':');

beforeEach(() => {
  fakeWorker();
  vi.stubGlobal('chrome', { ...chrome, i18n: { getMessage } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('the settings’ packs', () => {
  it('list every pack read, with what it holds', async () => {
    const { section } = await start([WOOD, CLICKS]);
    expect(names(section)).toEqual(['Pack ann/packs/main/wood/', 'Pack ann/packs/main/clicks/']);
    expect(
      queryAll(section, '.ln-ext-pack__parts', HTMLElement).map(parts => parts.textContent),
    ).toEqual(['packsPartBoard · packsPartPieces · packsPartSounds', 'packsPartSounds']);
  });

  it('remove a pack', async () => {
    const { library, section } = await start([WOOD, CLICKS]);
    queryOne(section, '.ln-ext-pack__remove', HTMLButtonElement)?.click();
    await flush();
    expect(library.packs()).toEqual([CLICKS]);
    expect(names(section)).toEqual(['Pack ann/packs/main/clicks/']);
  });

  it('say so when the packs can’t be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { section } = await start([], () => Promise.reject(new Error('blocked')));
    expect(section.querySelector('.ln-ext-packs__empty')?.textContent).toBe('packsUnreadable');
  });
});

describe('importing a pack', () => {
  const files = new Map([
    ['pack.json', new TextEncoder().encode('{"name":"Clicks","sounds":{"capture":"c.mp3"}}')],
    ['c.mp3', new Uint8Array([0x49, 0x44, 0x33, 4])],
  ]);

  it('downloads it, lists it, picks it, and says so', async () => {
    fakeGithub({ repo: 'ann/packs', files });
    const { library, section } = await start([]);
    expect(section.querySelector('.ln-ext-packs__empty')?.textContent).toBe('packsEmpty');
    submit(section, 'https://github.com/ann/packs');
    expect(status(section)).toBe('packsImporting');
    await vi.waitFor(() => expect(library.packs()).toHaveLength(1));
    await flush();
    expect(names(section)).toEqual(['Clicks']);
    expect(library.current('sound')).toBe('ann/packs/HEAD/');
    expect(status(section)).toBe('packsImported:Clicks');
    expect(queryOne(section, '.ln-ext-packs__row input', HTMLInputElement)?.value).toBe('');
  });

  it('takes the token in no form and no password field, which browsers offer to save', async () => {
    fakeGithub({ repo: 'ann/packs', files });
    const { library, section } = await start([]);
    expect(section.querySelector('form, input[type="password"]')).toBeNull();
    const link = queryOne(section, '.ln-ext-packs__row input', HTMLInputElement);
    if (!link) throw new Error('no link field');
    link.value = 'https://github.com/ann/packs';
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await vi.waitFor(() => expect(library.packs()).toHaveLength(1));
  });

  it('keeps the token when there’s no link to import yet', async () => {
    const { section } = await start([]);
    submit(section, '  ', 'secret');
    expect(status(section)).toBe('packsNoLink');
    expect(queryOne(section, '.ln-ext-packs__token', HTMLInputElement)?.value).toBe('secret');
  });

  it('says what went wrong, keeping the link to fix it', async () => {
    fakeGithub({ repo: 'ann/packs', files, token: 'secret' });
    const { section } = await start([]);
    submit(section, 'https://github.com/ann/packs', 'nope');
    const [link, token] = queryAll(section, '.ln-ext-packs__import input', HTMLInputElement);
    // Never left in the page, which Lichess's scripts can read.
    expect(token?.value).toBe('');
    await vi.waitFor(() => expect(status(section)).toBe('GitHub turned the token down.'));
    expect(section.querySelector('.ln-ext-packs__status--failed')).not.toBeNull();
    expect(link?.value).toBe('https://github.com/ann/packs');
  });
});
