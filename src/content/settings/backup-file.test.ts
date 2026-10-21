import { describe, expect, it } from 'vitest';
import { fakePack } from '#shared/testing/packs.ts';
import { backupFileName, makeBackup, readBackup } from './backup-file.ts';
import { parseSettings } from './settings.ts';

const CREATED = new Date('2026-10-21T18:30:00Z');

const backup = makeBackup({
  settings: { ...parseSettings({}), uiSounds: false, gameIntro: 'off' },
  stored: { board: 'ann/packs/main/wood/', customBoard: '{"light":"#eeeeee"}', name: 'Ann' },
  packs: [fakePack('ann/packs/main/wood/')],
  extension: '2.4.12',
  created: CREATED,
});

const reread = (change: (file: Record<string, unknown>) => Record<string, unknown>): unknown =>
  readBackup(JSON.stringify(change({ ...backup })));

describe('a settings backup', () => {
  it('reads back as it was written, packs whole', () => {
    expect(readBackup(JSON.stringify(backup))).toEqual(backup);
    expect(backup).toMatchObject({ format: 'lichess-neo-settings', version: 1 });
    expect(backup.created).toBe('2026-10-21T18:30:00.000Z');
  });

  it('is not another JSON file, nor a later format', () => {
    expect(readBackup('{"name":"Pack"}')).toBeNull();
    expect(readBackup('not json')).toBeNull();
    expect(reread(file => ({ ...file, format: 'other' }))).toBeNull();
    expect(reread(file => ({ ...file, version: 2 }))).toBeNull();
  });

  it('takes only the picks it knows, of a sane size', () => {
    expect(reread(file => ({ ...file, stored: { reviewIndex: '[]' } }))).toBeNull();
    expect(reread(file => ({ ...file, stored: { name: 'x'.repeat(1_000_001) } }))).toBeNull();
    expect(reread(file => ({ ...file, packs: [{ id: 'broken' }] }))).toBeNull();
  });

  it('takes the defaults for the settings an older extension didn’t have', () => {
    const read = reread(file => ({ ...file, settings: { uiSounds: false } }));
    expect(read).toMatchObject({ settings: { ...parseSettings({}), uiSounds: false } });
  });

  it('is named after the user’s day', () => {
    expect(backupFileName(new Date(2026, 0, 5, 23, 59))).toBe(
      'lichess-neo-settings-2026-01-05.json',
    );
  });
});
