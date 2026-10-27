import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's own rule (chessground's): every piece placed as on a board's square.
const LICHESS_RULE = 'piece { position: absolute; top: 0; left: 0; width: 12.5%; height: 12.5%; }';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('the practice coach’s turn row', () => {
  it('keeps its king in its tile', () => {
    const style = document.createElement('style');
    style.textContent =
      LICHESS_RULE + readFileSync(join(import.meta.dirname, 'turn-row.css'), 'utf8');
    document.head.append(style);
    document.body.innerHTML =
      '<div class="ln-ext-practice-turn" data-ln-ext-color="white">' +
      '<span class="ln-ext-practice-turn__king"><piece class="king white"></piece></span></div>';
    const king = queryOne(document, 'piece', HTMLElement);
    if (!king) throw new Error('no king');
    const { position, width, height } = getComputedStyle(king);
    expect({ position, width, height }).toEqual({
      position: 'static',
      width: '100%',
      height: '100%',
    });
  });
});
