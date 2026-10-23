import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeStudies } from '#page/review/fixtures/fake-studies.ts';
import { entry } from '#page/review/fixtures/practice.ts';
import { blockStorage } from '#shared/testing/storage.ts';
import { type Entry, entryKey } from './repertoire.ts';
import { treeEntries, withEntries } from './chapters.ts';
import { parseMovetext, writeMovetext } from './pgn-tree.ts';

const SYNC = 'ln-ext-practice-sync';
const REPERTOIRE = 'ln-ext-practice-repertoire';
const STUDIES = { white: 'whitestudy', black: 'blackstudy' };
const AN_HOUR = 3600_000;
const LAST = Date.UTC(2026, 9, 23, 9);

const PIANO = entry({
  moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
  answers: ['c3'],
  name: 'Italian Game: Giuoco Piano',
  last: LAST,
  due: LAST + AN_HOUR,
});
const SICILIAN = entry({
  side: 'black',
  moves: ['e4'],
  answers: ['c5'],
  name: 'Sicilian Defense',
  last: LAST,
  due: LAST + AN_HOUR,
});

/** The sync and the repertoire as a new visit finds them. */
async function visit(state: { dirty?: string[]; pruned?: string[] } | null, entries: Entry[]) {
  if (state) localStorage.setItem(SYNC, JSON.stringify({ studies: STUDIES, dirty: [], ...state }));
  localStorage.setItem(REPERTOIRE, JSON.stringify(entries));
  vi.resetModules();
  const sync = await import('./sync.ts');
  const repertoire = await import('./repertoire.ts');
  return { sync, repertoire };
}

const stored = (): unknown => JSON.parse(localStorage.getItem(SYNC) ?? 'null');

/** A chapter's positions, as the study keeps them. */
const recorded = (pgn: string, side: 'white' | 'black', name: string): Entry[] =>
  treeEntries(parseMovetext(pgn), side, name);

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('while the copy is off', () => {
  it('reads and writes nothing', async () => {
    const lichess = fakeStudies({});
    const { sync } = await visit(null, [PIANO]);
    expect(sync.syncShown()).toEqual({ on: false, busy: false, failed: false });
    await sync.startSync();
    await sync.pushSync();
    sync.noteChanged('white', PIANO.name);
    expect(lichess.asked).toEqual([]);
    expect(localStorage.getItem(SYNC)).toBeNull();
  });

  it('is off when the storage is blocked', async () => {
    const { sync } = await visit(null, []);
    blockStorage();
    expect(sync.syncState()).toBeNull();
  });
});

describe('the first sync', () => {
  it('writes each opening of the local copy in a chapter of its side’s study', async () => {
    const lichess = fakeStudies({ [STUDIES.white]: 'White', [STUDIES.black]: 'Black' });
    const { sync } = await visit({}, [PIANO, SICILIAN]);
    await sync.startSync();
    const italian = lichess.chapter(STUDIES.white, 'Italian Game');
    expect(italian?.orientation).toBe('white');
    expect(recorded(italian?.pgn ?? '', 'white', PIANO.name)).toEqual([PIANO]);
    const sicilian = lichess.chapter(STUDIES.black, 'Sicilian Defense');
    expect(recorded(sicilian?.pgn ?? '', 'black', SICILIAN.name)).toEqual([SICILIAN]);
    expect(stored()).toEqual({ studies: STUDIES, dirty: [], pruned: [] });
    expect(sync.syncShown()).toEqual({ on: true, busy: false, failed: false });
  });

  it('reads the studies once a visit', async () => {
    const lichess = fakeStudies({ [STUDIES.white]: 'White', [STUDIES.black]: 'Black' });
    const { sync } = await visit({}, []);
    await Promise.all([sync.startSync(), sync.startSync()]);
    await sync.startSync();
    expect(lichess.asked.map(request => request.url.split('?')[0])).toEqual([
      `/study/${STUDIES.white}.pgn`,
      `/study/${STUDIES.black}.pgn`,
    ]);
  });
});

/** The studies with a chapter of the Italian, its positions `entries`, the user’s words in it. */
function studiesWith(entries: readonly Entry[]) {
  const lichess = fakeStudies({ [STUDIES.white]: 'White', [STUDIES.black]: 'Black' });
  const tree = withEntries(parseMovetext('{ My Italian } *'), entries);
  lichess.studies.get(STUDIES.white)?.push({
    id: 'italian1',
    name: 'Italian Game',
    orientation: 'white',
    pgn: writeMovetext(tree),
  });
  return lichess;
}

describe('merging the copies', () => {
  it('takes a position the study has played later, and writes nothing back', async () => {
    const later = { ...PIANO, seen: 5, last: LAST + AN_HOUR };
    const lichess = studiesWith([later]);
    const { sync, repertoire } = await visit({}, [PIANO]);
    await sync.startSync();
    const { name: _name, ...record } = later;
    expect(repertoire.storedRepertoire()).toMatchObject([record]);
    expect(lichess.asked.filter(request => request.method === 'POST')).toEqual([]);
  });

  it('writes back a position played later here, the user’s words kept', async () => {
    const lichess = studiesWith([PIANO]);
    const later = { ...PIANO, seen: 3, last: LAST + AN_HOUR };
    const { sync, repertoire } = await visit({}, [later, SICILIAN]);
    await sync.startSync();
    expect(repertoire.storedRepertoire().map(entryKey)).toEqual(
      [entryKey(PIANO), entryKey(SICILIAN)].toSorted(),
    );
    const italian = lichess.chapter(STUDIES.white, 'Italian Game');
    expect(italian?.id).toBe('italian1');
    expect(italian?.pgn).toMatch(/^\{ My Italian \}/);
    expect(recorded(italian?.pgn ?? '', 'white', PIANO.name)).toEqual([later]);
    expect(lichess.studies.get(STUDIES.white)).toHaveLength(1);
  });
});

/** The user's two studies, empty. */
const both = () => fakeStudies({ [STUDIES.white]: 'White', [STUDIES.black]: 'Black' });

describe('writing the changes', () => {
  it('writes a chapter changed once the line ends, in its place', async () => {
    const lichess = both();
    const { sync, repertoire } = await visit({}, [PIANO]);
    await sync.startSync();
    const id = lichess.chapter(STUDIES.white, 'Italian Game')?.id;
    const again = { ...PIANO, seen: 2, last: LAST + AN_HOUR };
    repertoire.keepRepertoire([again]);
    sync.noteChanged('white', PIANO.name);
    sync.noteChanged('white', 'Italian Game: Evans Gambit');
    expect(stored()).toMatchObject({ dirty: ['white|Italian Game'] });
    await sync.pushSync();
    const italian = lichess.chapter(STUDIES.white, 'Italian Game');
    expect(italian?.id).toBe(id);
    expect(recorded(italian?.pgn ?? '', 'white', PIANO.name)).toEqual([again]);
    expect(stored()).toMatchObject({ dirty: [] });
  });

  it('reads the studies first, when the visit hasn’t yet', async () => {
    const lichess = both();
    const { sync } = await visit({ dirty: ['white|Italian Game'] }, [PIANO]);
    await sync.pushSync();
    expect(lichess.asked.map(request => request.method)).toEqual([
      'GET',
      'GET',
      'POST',
      'GET',
      'GET',
    ]);
    expect(lichess.chapter(STUDIES.white, 'Italian Game')).toBeDefined();
  });

  it('cuts a line the user removed from the study too', async () => {
    const lichess = both();
    const { sync, repertoire } = await visit({}, [
      PIANO,
      entry({ ...PIANO, moves: PIANO.moves.slice(0, 4), answers: ['Bc4'] }),
    ]);
    await sync.startSync();
    repertoire.keepRepertoire(
      repertoire.storedRepertoire().filter(each => each.moves.length === 4),
    );
    sync.notePruned('white', [...PIANO.moves, 'c3'], [PIANO.name]);
    expect(stored()).toMatchObject({
      dirty: ['white|Italian Game'],
      pruned: ['white|e4 e5 Nf3 Nc6 Bc4 Bc5 c3'],
    });
    await sync.pushSync();
    const pgn = lichess.chapter(STUDIES.white, 'Italian Game')?.pgn ?? '';
    expect(pgn).not.toContain('c3');
    expect(stored()).toMatchObject({ dirty: [], pruned: [] });
  });

  it('puts a new opening in a chapter of others once the study is nearly full', async () => {
    const lichess = both();
    const chapters = lichess.studies.get(STUDIES.white);
    for (let i = 0; i < 63; i++)
      chapters?.push({
        id: `full${String(i).padStart(4, '0')}`,
        name: `Opening ${i}`,
        orientation: 'white',
        pgn: '*',
      });
    const { sync } = await visit({}, [PIANO]);
    await sync.startSync();
    expect(lichess.chapter(STUDIES.white, 'Italian Game')).toBeUndefined();
    const others = lichess.chapter(STUDIES.white, 'Other openings');
    expect(recorded(others?.pgn ?? '', 'white', PIANO.name)).toHaveLength(1);
  });
});

describe('the state shown', () => {
  it('is busy while a task runs, and failed until one succeeds', async () => {
    const lichess = fakeStudies({ [STUDIES.white]: 'White', [STUDIES.black]: 'Black' });
    lichess.failing.add(STUDIES.black);
    const { sync } = await visit({}, [PIANO]);
    const shown: ReturnType<typeof sync.syncShown>[] = [];
    sync.onSync(() => shown.push(sync.syncShown()));
    await sync.startSync();
    expect(shown).toEqual([
      { on: true, busy: true, failed: false },
      { on: true, busy: false, failed: true },
    ]);
    expect(console.warn).toHaveBeenCalledTimes(1);
    lichess.failing.clear();
    await sync.track(sync.syncNow);
    expect(sync.syncShown().failed).toBe(false);
    expect(lichess.chapter(STUDIES.white, 'Italian Game')).toBeDefined();
  });

  it('runs one task at a time, in order', async () => {
    const { sync } = await visit(null, []);
    const order: string[] = [];
    const first = sync.track(async () => {
      order.push('first starts');
      await Promise.resolve();
      order.push('first ends');
    });
    const second = sync.track(async () => {
      order.push('second');
    });
    await Promise.all([first, second]);
    expect(order).toEqual(['first starts', 'first ends', 'second']);
  });

  it('stops, leaving the studies alone', async () => {
    const lichess = fakeStudies({ [STUDIES.white]: 'White', [STUDIES.black]: 'Black' });
    const { sync } = await visit({}, [PIANO]);
    await sync.startSync();
    const asked = lichess.asked.length;
    sync.stopSync();
    expect(sync.syncShown().on).toBe(false);
    expect(lichess.studies.get(STUDIES.white)).toHaveLength(1);
    await sync.startSync();
    expect(lichess.asked).toHaveLength(asked);
  });
});
