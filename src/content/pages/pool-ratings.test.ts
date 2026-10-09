import { afterEach, describe, expect, it } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { syncPoolRatings } from './pool-ratings.ts';

// Lichess's quick pairing, cut to a few pools.
const POOLS =
  '<main class="lobby"><div class="lpools">' +
  ['1+0', '2+1', '3+0', '10+0', '30+0', 'custom']
    .map(id => `<div class="lpool" data-id="${id}"><div class="clock">${id}</div></div>`)
    .join('') +
  '</div></main>';

const withRating = (): (string | null)[] =>
  queryAll(document, '.lpool', HTMLElement)
    .filter(pool => pool.querySelector(':scope > .cdc-pool-rating > .cdc-pool-rating__name'))
    .map(pool => pool.dataset.id ?? null);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('syncPoolRatings', () => {
  it("gives each speed's first pool one rating span, and no other pool", () => {
    document.body.innerHTML = POOLS;
    syncPoolRatings();
    syncPoolRatings();
    expect(withRating()).toEqual(['1+0', '3+0', '10+0', '30+0']);
    expect(document.querySelectorAll('.cdc-pool-rating')).toHaveLength(4);
  });

  it('puts it back when Lichess draws the pools anew', () => {
    document.body.innerHTML = POOLS;
    syncPoolRatings();
    document.body.innerHTML = POOLS;
    syncPoolRatings();
    expect(withRating()).toEqual(['1+0', '3+0', '10+0', '30+0']);
  });
});
