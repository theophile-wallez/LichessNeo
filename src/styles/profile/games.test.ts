import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// A row of a profile's games, with the checkbox LiChess Tools puts first in it
// (tools/gameListOptions/tool.js).
const ROW =
  '<main class="page-menu user-show"><div class="angle-content"><div class="games">' +
  '<article class="game-row lichessTools-gameListOptions-select"><input type="checkbox">' +
  '<a class="game-row__overlay" href="/abcdefgh"></a>' +
  '<div class="game-row__board"><span class="mini-board"></span></div>' +
  '<div class="game-row__infos"><div class="header" data-icon=""></div>' +
  '<div class="versus"></div><div class="result"></div></div>' +
  '</article></div></div></main>';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('a profile game row', () => {
  it('keeps the board and its infos side by side after a checkbox put before them', () => {
    const style = document.createElement('style');
    style.textContent = readFileSync(join(import.meta.dirname, 'games.css'), 'utf8');
    document.head.append(style);
    document.body.innerHTML = ROW;
    const row = queryOne(document, '.game-row', HTMLElement);
    const board = queryOne(document, '.game-row__board', HTMLElement);
    const infos = queryOne(document, '.game-row__infos', HTMLElement);
    if (!row || !board || !infos) throw new Error('no game row');
    // A grid would give the checkbox the board's column and wrap the infos below.
    expect(getComputedStyle(row).display).toBe('flex');
    expect(getComputedStyle(row).flexWrap).not.toBe('wrap');
    expect(getComputedStyle(board).flexGrow).toBe('0');
    expect(getComputedStyle(infos).flexGrow).toBe('1');
  });
});
