import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from './dom.ts';
import { readPlayer } from './player-bar.ts';

// Bars as Lichess draws them: a titled user, and the computer.
const USER_BAR =
  '<div class="ruser-bottom ruser user-link online" data-lr-ext-flag="🇫🇷"><icon class="line"></icon>' +
  '<a class="user-link ulpt" href="/@/tjychess"><span class="utitle">GM&nbsp;</span>tjychess</a>' +
  '<rating>3062?</rating></div>';
const COMPUTER_BAR =
  '<div class="user-link online ruser ruser-top"><icon class="line"></icon><name>Stockfish level 3</name></div>';

function bar(markup: string): HTMLElement {
  document.body.innerHTML = markup;
  const element = queryOne(document, '.ruser', HTMLElement);
  if (!element) throw new Error('no bar');
  return element;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('readPlayer', () => {
  it('reads a user’s name apart from their title, with their rating and flag', () => {
    expect(readPlayer(bar(USER_BAR), undefined)).toEqual({
      name: 'tjychess',
      user: 'tjychess',
      title: 'GM',
      rating: '3062?',
      flag: '🇫🇷',
      computer: false,
    });
  });

  it('gives the computer its level’s rating', () => {
    expect(readPlayer(bar(COMPUTER_BAR), '~800')).toEqual({
      name: 'Stockfish level 3',
      user: undefined,
      title: undefined,
      rating: '~800',
      flag: undefined,
      computer: true,
    });
  });
});
