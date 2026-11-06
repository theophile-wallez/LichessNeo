import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// The home's grid (grid.css), then the recent games' own rules, at a desktop's width.
const RULES = ['grid.css', 'games.css']
  .map(name => readFileSync(join(import.meta.dirname, name), 'utf8'))
  .join('\n');

const LOBBY =
  '<main class="lobby"><section class="ln-ext-home-games"></section>' +
  '<div class="lobby__puzzle"></div><div class="lobby__feed"></div></main>';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  delete document.documentElement.dataset.lnExtHas;
});

function newsPlace(has: string): { row: string; column: string } {
  document.documentElement.dataset.lnExtHas = has;
  const style = document.createElement('style');
  style.textContent = RULES;
  document.head.append(style);
  document.body.innerHTML = LOBBY;
  const news = queryOne(document, '.lobby__feed', HTMLElement);
  if (!news) throw new Error('no news');
  // happy-dom computes the shorthands only.
  const { gridRow, gridColumn } = getComputedStyle(news);
  return { row: gridRow, column: gridColumn };
}

describe('the home’s recent games on a desktop', () => {
  it('take the news’ place beside the puzzle, the news going under both', () => {
    expect(newsPlace('lobby lobby-games')).toEqual({ row: '6', column: '1 / -1' });
  });

  it('leave the grid as it was when they’re out', () => {
    expect(newsPlace('lobby')).toEqual({ row: '5', column: '1 / 9' });
  });
});
