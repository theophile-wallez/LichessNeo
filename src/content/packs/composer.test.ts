import { unzipSync } from 'fflate';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { fakePack } from '#shared/testing/packs.ts';
import { fakeWorker } from '#shared/testing/worker.ts';
import type { Pack } from '#shared/packs/pack.ts';
import { createLibrary, type Library } from './library.ts';

const saveFile = vi.hoisted(() => vi.fn<(blob: Blob, name: string) => void>());
vi.mock('#shared/save-file.ts', () => ({ saveFile }));

const BOARD = { ...fakePack('file:1/', ['board']), name: 'Harbor' };
const PIECES = { ...fakePack('file:2/', ['piece']), name: 'Mochi' };
const OTHER = { ...fakePack('file:3/', ['piece']), name: 'Pop' };

// The composer keeps what's chosen while the page is open: a fresh one for each test.
async function start(packs: readonly Pack[]): Promise<{ library: Library; box: HTMLElement }> {
  vi.resetModules();
  const { composer } = await import('./composer.ts');
  const library = createLibrary({
    readPicked: () => Promise.resolve([]),
    readAll: () => Promise.resolve(packs),
    save: () => Promise.resolve(),
    erase: () => Promise.resolve(),
    show: () => undefined,
  });
  await library.ready;
  await library.loadAll();
  const box = composer(library);
  document.body.append(box);
  return { library, box };
}

const chips = (box: HTMLElement): HTMLInputElement[] =>
  queryAll(box, '.ln-ext-compose__chip input', HTMLInputElement);
const exportButton = (box: HTMLElement): HTMLButtonElement | null =>
  queryOne(box, '.ln-ext-compose__export', HTMLButtonElement);

function rename(box: HTMLElement, name: string): void {
  const field = queryOne(box, '.ln-ext-compose__name', HTMLInputElement);
  if (!field) throw new Error('No name field');
  field.value = name;
  field.dispatchEvent(new Event('input'));
}

const getMessage = (name: string, substitutions: readonly string[] = []): string =>
  [name, ...substitutions].join(':');

beforeEach(() => {
  fakeWorker();
  vi.stubGlobal('chrome', { ...chrome, i18n: { getMessage } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  saveFile.mockClear();
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('the composer', () => {
  it('is empty while there is nothing to put in a pack', async () => {
    const { box } = await start([]);
    expect(box.childElementCount).toBe(0);
  });

  it('starts from the parts picked', async () => {
    localStorage.setItem('ln-ext-pieces', OTHER.id);
    const { box } = await start([BOARD, PIECES, OTHER]);
    expect(chips(box).map(chip => chip.checked)).toEqual([false, false, true]);
  });

  it('exports the parts checked, in a zip named as its GitHub repository', async () => {
    const { box } = await start([BOARD, PIECES]);
    const [board, pieces] = chips(box);
    board?.click();
    pieces?.click();
    rename(box, 'Bois d’été');
    exportButton(box)?.click();
    const [blob, name] = saveFile.mock.calls[0] ?? [];
    expect(name).toBe('LichessNeoPack_BoisDEte.zip');
    const files = unzipSync(new Uint8Array((await blob?.arrayBuffer()) ?? new ArrayBuffer(0)));
    expect(JSON.parse(new TextDecoder().decode(files['pack.json']))).toMatchObject({
      name: 'Bois d’été',
      pieces: 'pieces/{piece}.svg',
      board: { image: 'board.png' },
    });
  });

  it('waits for a name and a part', async () => {
    const { box } = await start([BOARD]);
    const [board] = chips(box);
    board?.click();
    expect(exportButton(box)?.disabled).toBe(false);
    rename(box, '  ');
    expect(exportButton(box)?.disabled).toBe(true);
    rename(box, 'Mine');
    board?.click();
    expect(exportButton(box)?.disabled).toBe(true);
  });

  it('says how to share it on GitHub, under the name it has', async () => {
    const { box } = await start([BOARD]);
    const codes = (): (string | null)[] =>
      queryAll(box, '.ln-ext-compose__code', HTMLElement).map(code => code.textContent);
    expect(codes()).toEqual(['LichessNeoPack_PacksComposeDefault', 'lichess-neo-pack']);
    rename(box, 'warm wood');
    expect(codes()).toEqual(['LichessNeoPack_WarmWood', 'lichess-neo-pack']);
    expect(queryOne(box, '.ln-ext-compose__share-help', HTMLAnchorElement)?.href).toMatch(
      /docs\/packs\.md#sharing-a-pack$/,
    );
  });
});
