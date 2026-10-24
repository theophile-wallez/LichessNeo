import { afterEach, describe, expect, it } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { syncTrophies } from './trophies.ts';

// A profile's awards as lila serves them (UserShow's trophies), cut to what the grouping reads.
const PERF = (top: string): string =>
  `<a href="/player/top/10/blitz" class="trophy perf ${top}" title="Top ${top}">` +
  `<img src="/assets/images/trophy/${top}.png"></a>`;
const MARATHON = (kind: string, id: string): string =>
  `<a href="/tournament/${id}" title="${kind}"><span class="trophy award ${kind} fire-trophy"></span></a>`;
const SHIELD = (glyph: string): string =>
  `<a class="shield-trophy combo-trophy" href="/tournament/shields" title="Shield">${glyph}</a>`;

function serve(awards: readonly string[]): void {
  document.body.innerHTML =
    '<main class="page-menu"><div class="user-show"><div class="box__top user-show__header">' +
    `<div class="trophies"><div class="stacked">${awards.join('')}</div></div></div></div></main>`;
}

/** Each award left on show, with the count on its tile. */
const onShow = (): (string | undefined)[][] =>
  queryAll(document, '.trophies :is(.trophy, .shield-trophy)', HTMLElement)
    .filter(tile => tile.closest('[data-ln-ext-trophy-repeat]') === null)
    .map(tile => [
      tile.closest('a')?.getAttribute('href') ?? undefined,
      tile.dataset.lnExtTrophyCount,
    ]);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('syncTrophies', () => {
  it('folds an award won again into its first tile, which counts them', () => {
    serve([
      MARATHON('marathonTopTen', 'a'),
      MARATHON('marathonTopTen', 'b'),
      MARATHON('marathonTopFifty', 'c'),
      MARATHON('marathonTopTen', 'd'),
    ]);
    syncTrophies();
    expect(onShow()).toEqual([
      ['/tournament/a', '3'],
      ['/tournament/c', undefined],
    ]);
  });

  it('tells awards of one class apart by their glyph or their picture', () => {
    serve([PERF('top10'), PERF('top50'), PERF('top10'), SHIELD(''), SHIELD('')]);
    syncTrophies();
    expect(onShow()).toEqual([
      ['/player/top/10/blitz', '2'],
      ['/player/top/10/blitz', undefined],
      ['/tournament/shields', undefined],
      ['/tournament/shields', undefined],
    ]);
  });

  it('hides the repeats without removing them, and stays so on the next pass', () => {
    serve([MARATHON('marathonWinner', 'a'), MARATHON('marathonWinner', 'b')]);
    syncTrophies();
    syncTrophies();
    expect(queryAll(document, '.trophies a', HTMLAnchorElement)).toHaveLength(2);
    expect(onShow()).toEqual([['/tournament/a', '2']]);
  });
});
