import { describe, expect, it } from 'vitest';
import { PRACTICE_HASH, PRACTICE_URL } from './practice-page.ts';
import { PREFIX } from './prefix.ts';

describe('the practice page', () => {
  it('is the free analysis board under a hash of ours', () => {
    expect(PRACTICE_HASH.startsWith(`#${PREFIX}`)).toBe(true);
    expect(PRACTICE_URL).toBe('/analysis#ln-ext-practice');
    const url = new URL(PRACTICE_URL, 'https://lichess.org');
    expect([url.pathname, url.hash]).toEqual(['/analysis', PRACTICE_HASH]);
  });
});
