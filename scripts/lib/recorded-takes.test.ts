import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from './paths.ts';
import { assertRecordedTakes, RECORDED_FOLDER } from './recorded-takes.ts';

const files = readdirSync(fromRoot('public', RECORDED_FOLDER));

describe('assertRecordedTakes', () => {
  it('passes the set as it is in public/', () => {
    expect(() => assertRecordedTakes(files)).not.toThrow();
  });

  it('fails on a take missing, or a file no sound counts', () => {
    expect(() => assertRecordedTakes(files.filter(file => file !== 'castle-4.ogg'))).toThrow(
      'recorded takes missing: sounds/naturel/castle-4.ogg',
    );
    expect(() => assertRecordedTakes([...files, 'castle-5.ogg'])).toThrow(
      'files not in RECORDED_TAKES: sounds/naturel/castle-5.ogg',
    );
  });
});
