import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import type { LocalFile } from '#shared/packs/local.ts';
import { PIECE_NAMES } from '#shared/packs/pack.ts';
import { fakePack } from '#shared/testing/packs.ts';
import { flush } from '#shared/testing/timers.ts';
import { fakeWorker } from '#shared/testing/worker.ts';
import { type DialogBody, openImportDialog } from './import-dialog.ts';
import { createLibrary, type Library } from './library.ts';
import { pieceBody } from './piece-body.ts';
import { soundBody } from './sound-body.ts';

type Confirm = (name: string, files: readonly LocalFile[]) => Promise<string | null>;

const file = (path: string): LocalFile => ({
  path,
  size: 1,
  read: () => Promise.resolve(new Uint8Array([1])),
});

async function library(packs: readonly ReturnType<typeof fakePack>[] = []): Promise<Library> {
  const created = createLibrary({
    readPicked: () => Promise.resolve([]),
    readAll: () => Promise.resolve(packs),
    save: () => Promise.resolve(),
    erase: () => Promise.resolve(),
    show: () => undefined,
  });
  await created.ready;
  await created.loadAll();
  return created;
}

interface Opened {
  readonly closed: Promise<void>;
  readonly confirm: ReturnType<typeof vi.fn<Confirm>>;
}

async function open(
  body: DialogBody,
  {
    answer = null,
    packs = [],
  }: { answer?: string | null; packs?: ReturnType<typeof fakePack>[] } = {},
): Promise<Opened> {
  const confirm = vi.fn<Confirm>(() => Promise.resolve(answer));
  const closed = openImportDialog({ kind: 'piece', body, library: await library(packs), confirm });
  return { closed, confirm };
}

const dialog = (): HTMLDialogElement | null =>
  queryOne(document, '.ln-ext-pack-dialog', HTMLDialogElement);
const nameInput = (): HTMLInputElement | null =>
  queryOne(document, '.ln-ext-pack-dialog__name input', HTMLInputElement);
const importButton = (): HTMLButtonElement | null =>
  queryOne(document, '.ln-ext-pack-dialog__confirm', HTMLButtonElement);
const status = (): string | null | undefined =>
  document.querySelector('.ln-ext-pack-dialog__status')?.textContent;

function typeName(name: string): void {
  const input = nameInput();
  if (!input) throw new Error('No name field');
  input.value = name;
  input.dispatchEvent(new Event('input'));
}

const getMessage = (name: string, substitutions: readonly string[] = []): string =>
  [name, ...substitutions].join(':');

beforeEach(() => {
  fakeWorker();
  vi.stubGlobal('chrome', { ...chrome, i18n: { getMessage } });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:piece');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  document.body.innerHTML = '';
});

// Eleven pieces named so, and the black queen under a name of its own.
const PIECES = [
  ...PIECE_NAMES.filter(piece => piece !== 'bQ').map(piece => file(`${piece}.png`)),
  file('dame.png'),
];

describe('the import dialog', () => {
  it('waits for a name, then for every piece', async () => {
    await open(pieceBody(PIECES));
    expect(dialog()?.open).toBe(true);
    expect(nameInput()?.value).toBe('');
    expect(importButton()?.disabled).toBe(true);
    expect(status()).toBe('packsDialogNoName');
    typeName('Mochi');
    expect(importButton()?.disabled).toBe(true);
    expect(status()).toMatch(/^packsDialogMissing/);
  });

  it('puts a file left aside in the slot tapped next, and imports them under their names', async () => {
    const { closed, confirm } = await open(pieceBody(PIECES));
    typeName('  Mochi ');
    const [loose] = queryAll(document, '.ln-ext-pack-dialog__loose', HTMLButtonElement);
    expect(loose?.textContent).toBe('dame.png');
    loose?.click();
    queryOne(document, '.ln-ext-pack-slot[aria-label="bQ"]', HTMLElement)?.click();
    expect(document.querySelector('.ln-ext-pack-dialog__loose')).toBeNull();
    expect(importButton()?.disabled).toBe(false);
    importButton()?.click();
    await closed;
    const [name, files] = confirm.mock.calls[0] ?? [];
    expect(name).toBe('Mochi');
    expect(files?.map(entry => entry.path).toSorted()).toEqual(
      PIECE_NAMES.map(piece => `${piece}.png`).toSorted(),
    );
    expect(dialog()).toBeNull();
  });

  it('stays open on what the import said went wrong', async () => {
    const named = PIECE_NAMES.map(piece => file(`${piece}.png`));
    await open(pieceBody(named), { answer: 'wK.png is not an image.' });
    typeName('Mochi');
    importButton()?.click();
    await flush();
    expect(dialog()?.open).toBe(true);
    expect(status()).toBe('wK.png is not an image.');
    expect(document.querySelector('.ln-ext-pack-dialog__status--failed')).not.toBeNull();
  });

  it('says when the name replaces an item of the user’s', async () => {
    const mochi = { ...fakePack('file:1/', ['piece']), name: 'Mochi' };
    await open(pieceBody(PIECES), { packs: [mochi] });
    typeName('mochi');
    expect(document.querySelector('.ln-ext-pack-dialog__replaces')?.textContent).toBe(
      'packsDialogReplaces:Mochi',
    );
  });

  it('closes on its cancel button without importing', async () => {
    const { closed, confirm } = await open(pieceBody(PIECES));
    queryOne(document, '.ln-ext-pack-dialog__cancel', HTMLButtonElement)?.click();
    await closed;
    expect(confirm).not.toHaveBeenCalled();
  });
});

describe('the sounds’ dialog', () => {
  it('names each sound for what it plays, and leaves the unknown aside', async () => {
    const { closed, confirm } = await open(soundBody([file('Move.mp3'), file('boom.ogg')]));
    expect(
      queryAll(document, '.ln-ext-pack-dialog__loose', HTMLElement).map(chip => chip.textContent),
    ).toEqual(['boom.ogg']);
    typeName('Clicks');
    importButton()?.click();
    await closed;
    expect(confirm.mock.calls[0]?.[1].map(entry => entry.path)).toEqual(['move-self.mp3']);
  });

  it('needs one sound at least', async () => {
    await open(soundBody([file('boom.ogg')]));
    typeName('Clicks');
    expect(status()).toBe('packsDialogNoSound');
    expect(importButton()?.disabled).toBe(true);
  });
});
