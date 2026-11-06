import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { fakePack, SOUND } from '#shared/testing/packs.ts';
import { flush } from '#shared/testing/timers.ts';
import { fakeWorker } from '#shared/testing/worker.ts';
import type { Pack } from '#shared/packs/pack.ts';
import { itemRows } from './item-tiles.ts';
import { createLibrary, type Library } from './library.ts';

const item = (
  id: string,
  kind: 'board' | 'piece' | 'sound',
  name: string,
  added?: number,
): Pack => ({
  ...fakePack(id, [kind]),
  name,
  link: '',
  ...(added !== undefined && { added }),
});

const HARBOR = item('file:1/', 'board', 'Harbor', 1);
const MAPLE = item('file:2/', 'board', 'Maple', 2);
const CLICKS = {
  ...item('file:3/', 'sound', 'Clicks', 3),
  sounds: { capture: SOUND, castle: SOUND },
};

async function start(
  packs: readonly Pack[],
): Promise<{ library: Library; rows: () => HTMLElement }> {
  const library = createLibrary({
    readPicked: () => Promise.resolve([]),
    readAll: () => Promise.resolve(packs),
    save: () => Promise.resolve(),
    erase: () => Promise.resolve(),
    show: () => undefined,
  });
  await library.ready;
  await library.loadAll();
  // The card draws the rows again whenever the library changes (import-section.ts).
  let rows = itemRows(library);
  document.body.append(rows);
  library.onChange(() => {
    const next = itemRows(library);
    rows.replaceWith(next);
    rows = next;
  });
  return { library, rows: () => rows };
}

const row = (rows: HTMLElement, kind: string): HTMLElement => {
  const found = queryOne(rows, `.ln-ext-packs__kind--${kind}`, HTMLElement);
  if (!found) throw new Error(`No ${kind} row`);
  return found;
};
const tileNames = (rows: HTMLElement, kind: string): (string | null)[] =>
  queryAll(row(rows, kind), '.ln-ext-item__name', HTMLElement).map(name => name.textContent);

const getMessage = (name: string, substitutions: readonly string[] = []): string =>
  [name, ...substitutions].join(':');

beforeEach(() => {
  fakeWorker();
  vi.stubGlobal('chrome', { ...chrome, i18n: { getMessage } });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:sound');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('the user’s own items', () => {
  it('come in a row per kind, after the zone that adds one, the newest first', async () => {
    const { rows } = await start([HARBOR, CLICKS, MAPLE]);
    expect(tileNames(rows(), 'board')).toEqual(['Maple', 'Harbor']);
    expect(tileNames(rows(), 'piece')).toEqual([]);
    expect(tileNames(rows(), 'sound')).toEqual(['Clicks']);
    expect(
      queryOne(row(rows(), 'board'), '.ln-ext-packs__tiles', HTMLElement)?.firstElementChild
        ?.className,
    ).toMatch(/ln-ext-packs__drop/);
  });

  it('are picked by a click on their tile', async () => {
    const { library, rows } = await start([HARBOR, MAPLE]);
    const [maple] = queryAll(row(rows(), 'board'), '.ln-ext-item__pick', HTMLButtonElement);
    maple?.click();
    await flush();
    expect(library.current('board')).toBe(MAPLE.id);
    const picked = queryAll(rows(), '.ln-ext-item--on .ln-ext-item__name', HTMLElement);
    expect(picked.map(name => name.textContent)).toEqual(['Maple']);
    expect(
      queryOne(rows(), '.ln-ext-item--on .ln-ext-item__pick', HTMLButtonElement)?.getAttribute(
        'aria-pressed',
      ),
    ).toBe('true');
  });

  it('are removed by their button', async () => {
    const { library, rows } = await start([HARBOR, MAPLE]);
    queryOne(row(rows(), 'board'), '.ln-ext-item__remove', HTMLButtonElement)?.click();
    await vi.waitFor(() => expect(library.packs()).toEqual([HARBOR]));
    expect(tileNames(rows(), 'board')).toEqual(['Harbor']);
  });

  it('give a sound set a player in place of a preview', async () => {
    const { rows } = await start([CLICKS, HARBOR]);
    expect(queryAll(rows(), '.ln-ext-player', HTMLElement)).toHaveLength(1);
    expect(row(rows(), 'sound').querySelector('.ln-ext-player__caption')?.textContent).toBe(
      'packsSoundCount:2',
    );
  });

  it('are edited in the import dialog, under the same id, so they stay picked', async () => {
    localStorage.setItem('ln-ext-sounds', CLICKS.id);
    const { library, rows } = await start([CLICKS]);
    expect(library.current('sound')).toBe(CLICKS.id);
    queryOne(rows(), '.ln-ext-item__edit', HTMLButtonElement)?.click();
    const name = await vi.waitFor(() => {
      const field = queryOne(document, '.ln-ext-pack-dialog__name input', HTMLInputElement);
      if (!field) throw new Error('No dialog yet');
      return field;
    });
    expect(name.value).toBe('Clicks');
    await vi.waitFor(() =>
      expect(
        queryAll(document, '.ln-ext-pack-sound__file-name', HTMLElement).map(
          file => file.textContent,
        ),
      ).toEqual(['capture.mp3', 'castle.mp3']),
    );
    name.value = 'Pops';
    name.dispatchEvent(new Event('input'));
    queryOne(document, '.ln-ext-pack-dialog__confirm', HTMLButtonElement)?.click();
    await vi.waitFor(() => expect(library.packs().map(pack => pack.name)).toEqual(['Pops']));
    expect(library.packs()[0]).toMatchObject({ id: CLICKS.id, added: 3, sounds: CLICKS.sounds });
    expect(library.current('sound')).toBe(CLICKS.id);
    expect(tileNames(rows(), 'sound')).toEqual(['Pops']);
  });
});
