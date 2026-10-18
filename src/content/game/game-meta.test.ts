import { afterEach, describe, expect, it } from 'vitest';
import type { Color } from '#shared/chess/types.ts';
import { queryOne } from '#shared/dom.ts';
import { infoParts, readResult, syncGameMeta } from './game-meta.ts';
// The game info as the original left it.
import legacy from './fixtures/legacy-game-meta.json' with { type: 'json' };

const ratings = new Map<Color, string>(
  Object.entries(legacy.computer).flatMap(([color, rating]) =>
    color === 'white' || color === 'black' ? [[color, rating]] : [],
  ),
);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('game info', () => {
  it.each(legacy.scenarios)('splits it as the original did: $name', ({ html, after, again }) => {
    document.body.innerHTML = html;
    syncGameMeta(ratings);
    expect(document.querySelector('.game__meta')?.innerHTML).toBe(after);
    syncGameMeta(ratings);
    expect(document.querySelector('.game__meta')?.innerHTML).toBe(again);
  });

  it('only touches the game page’s side panel', () => {
    const html =
      '<main class="analyse"><div class="game__meta"><div class="setup">a • b</div></div></main>';
    document.body.innerHTML = html;
    syncGameMeta(ratings);
    expect(document.body.innerHTML).toBe(html);
  });

  it('splits a line on its bullets', () => {
    expect(infoParts(' 3+2 •Rated•  • Blitz ')).toEqual(['3+2', 'Rated', 'Blitz']);
  });

  it('puts a game’s result on it once over, and takes it off for a rematch', () => {
    document.body.innerHTML =
      '<main class="round"><div class="round__side"><div class="game__meta"></div></div>' +
      '<div class="result-wrap"><p class="result">0-1</p></div></main>';
    syncGameMeta(ratings);
    const meta = queryOne(document, '.game__meta', HTMLElement);
    expect(meta?.dataset.lnExtWinner).toBe('black');
    expect(meta?.style.getPropertyValue('--ln-ext-meta-score')).toBe('"0 – 1"');
    document.querySelector('.result-wrap')?.remove();
    syncGameMeta(ratings);
    expect(meta?.dataset.lnExtWinner).toBeUndefined();
    expect(meta?.style.getPropertyValue('--ln-ext-meta-score')).toBe('');
  });
});

describe('a game’s result', () => {
  it.each([
    ['1-0', 'white', '1 – 0'],
    ['0-1', 'black', '0 – 1'],
    [' ½-½ ', 'draw', '½ – ½'],
  ])('reads %j', (text, winner, score) => {
    expect(readResult(text)).toEqual({ winner, score });
  });

  it.each(['*', '', 'White is victorious'])('reads nothing from %j', text => {
    expect(readResult(text)).toBeNull();
  });
});
