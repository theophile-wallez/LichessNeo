import { afterEach, describe, expect, it } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { shareOf, syncOpenings } from './openings.ts';

// An opening's page as Lichess serves it: its title, then a card per next move, the
// second keeping the opening's name.
const PAGE =
  '<main class="opening"><h1 class="opening__title"><span class="opening__name">' +
  '<span class="opening__name__section">Sicilian Defense</span>' +
  '<span class="opening__name__section">Najdorf Variation</span></span></h1>' +
  '<div class="opening__nexts">' +
  '<a class="opening__next"><span class="opening__next__name">English Attack</span>' +
  '<span class="opening__next__result result-bar"><span class="white" style="height: 35.2%"></span>' +
  '<span class="draws" style="height:31%"></span><span class="black" style="height: 33.8%"></span></span></a>' +
  '<a class="opening__next"><span class="opening__next__name"> </span></a>' +
  '</div></main>';

afterEach(() => {
  document.body.replaceChildren();
});

const shares = (): string[] =>
  queryAll(document, '.result-bar > span', HTMLElement).map(part =>
    part.style.getPropertyValue('--lr-ext-share'),
  );

const names = (): (string | undefined)[] =>
  queryAll(document, '.opening__next__name', HTMLElement).map(name => name.dataset.lrExtName);

describe('a result bar’s share', () => {
  it.each([
    ['47.11%', '47.11'],
    [' 3% ', '3'],
    ['100%', '100'],
  ])('reads %j as %s', (height, share) => {
    expect(shareOf(height)).toBe(share);
  });

  it.each(['', '20px', 'auto', '-4%', '.5%'])('reads nothing from %j', height => {
    expect(shareOf(height)).toBeNull();
  });
});

describe('the openings’ cards', () => {
  it('lays each result bar’s heights across', () => {
    document.body.innerHTML = PAGE;
    syncOpenings();
    expect(shares()).toEqual(['35.2', '31', '33.8']);
  });

  it('names a move that keeps its opening after the page’s last title part', () => {
    document.body.innerHTML = PAGE;
    syncOpenings();
    expect(names()).toEqual([undefined, 'Najdorf Variation']);
  });

  it('names none on a page without a title, as a search’s', () => {
    document.body.innerHTML = PAGE.replace(/<h1.*<\/h1>/, '');
    syncOpenings();
    expect(names()).toEqual([undefined, undefined]);
  });

  it('leaves other pages alone', () => {
    document.body.innerHTML = PAGE.replace('<main class="opening">', '<main class="tv">');
    syncOpenings();
    expect(shares()).toEqual(['', '', '']);
    expect(names()).toEqual([undefined, undefined]);
  });
});
