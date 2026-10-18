import { afterEach, describe, expect, it } from 'vitest';
import { fideOffset, fideRankOffset } from './fide.ts';
// The offsets the original set for each FIDE list's URL.
import legacy from './fixtures/legacy-start.json' with { type: 'json' };

const root = document.documentElement;

afterEach(() => {
  delete root.dataset.lnExtFideSkip;
  root.style.removeProperty('--ln-ext-fide-skip');
  history.replaceState(null, '', '/');
});

describe('FIDE rank offset', () => {
  it.each(legacy.fide)(
    'sets what the original set on $path$search',
    ({ path, search, skip, variable }) => {
      history.replaceState(null, '', path + search);
      fideOffset.start();
      expect(root.dataset.lnExtFideSkip ?? null).toBe(skip);
      expect(root.style.getPropertyValue('--ln-ext-fide-skip') || null).toBe(variable);
    },
  );

  it('counts 30 rows a page', () => {
    expect(fideRankOffset('/fide', '?page=4')).toBe(90);
    expect(fideRankOffset('/fide', '?page=1')).toBeNull();
  });
});
