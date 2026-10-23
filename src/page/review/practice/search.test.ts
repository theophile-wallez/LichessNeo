import { describe, expect, it } from 'vitest';
import { fakeApi, text } from '#page/review/fixtures/fake-api.ts';
import { html } from '#shared/html.ts';
import { parseResults, searchOpenings } from './search.ts';

const result = (href: string, name: string, state: string): string =>
  html`<a class="opening__search__result" href="${href}">
    <span class="opening__search__result__title"> ${name} </span>
    <span class="opening__search__result__board">
      <span class="mini-board" data-state="${state}"></span>
    </span>
  </a>`.toString();

// Lichess's answer to /opening?q=caro, its results' markup alone.
const RESULTS = [
  result(
    '/opening/Caro-Kann_Defense',
    'Caro-Kann Defense',
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR,white,',
  ),
  result(
    '/opening/Caro-Kann_Defense/e4_c6',
    'Caro-Kann Defense',
    'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR,white,c7c6',
  ),
  result(
    '/opening/Caro-Kann_Defense_Advance_Variation/e4_c6_d4_d5_e5',
    'Caro-Kann Defense: Advance Variation',
    'rnbqkbnr/pp2pppp/2p5/3pP3/3P4/8/PPP2PPP/RNBQKBNR,white,e4e5',
  ),
  result('/opening/Nowhere/e4', 'No board', ''),
].join('\n');

describe('parseResults', () => {
  it('reads each opening’s name, moves, position and last move', () => {
    expect(parseResults(RESULTS)).toEqual([
      {
        name: 'Caro-Kann Defense',
        moves: ['e4', 'c6'],
        placement: 'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR',
        lastMove: 'c7c6',
      },
      {
        name: 'Caro-Kann Defense: Advance Variation',
        moves: ['e4', 'c6', 'd4', 'd5', 'e5'],
        placement: 'rnbqkbnr/pp2pppp/2p5/3pP3/3P4/8/PPP2PPP/RNBQKBNR',
        lastMove: 'e4e5',
      },
    ]);
  });

  it('decodes the moves of the link', () => {
    const [line] = parseResults(
      result('/opening/Check/e4_f5_Qh5%2B', 'Check', '8/8/8/8/8/8/8/8,white,d1h5'),
    );
    expect(line?.moves).toEqual(['e4', 'f5', 'Qh5+']);
  });

  it('finds nothing in a page without results', () => {
    expect(parseResults('<p>No opening found</p>')).toEqual([]);
    expect(parseResults('')).toEqual([]);
  });
});

describe('searchOpenings', () => {
  it('asks Lichess’s search as its own script does', async () => {
    const asked = fakeApi([[/^\/opening\?q=/, () => text(RESULTS)]]);
    expect(await searchOpenings('caro kann')).toHaveLength(2);
    expect(asked[0]?.url).toBe('/opening?q=caro%20kann');
    expect(asked[0]?.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
  });

  it('fails on an error', async () => {
    fakeApi([[/opening/, () => text('', 503)]]);
    await expect(searchOpenings('caro')).rejects.toThrow('Opening search: 503');
  });
});
