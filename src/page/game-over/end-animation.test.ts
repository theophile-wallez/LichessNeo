import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { StorageKey } from '#shared/storage.ts';
import { playEndAnimation, shownResult, type EndScene } from './end-animation.ts';

// The game page once it's over, seen from White: the last move landed on e4.
const ROUND =
  '<main class="round"><div class="round__app__board main-board"><div class="cg-wrap orientation-white">' +
  '<cg-container><cg-board></cg-board></cg-container></div></div></main>';

function addKeyed(tag: string, className: string, square: string): void {
  const element = Object.assign(document.createElement(tag), { cgKey: square });
  element.className = className;
  document.querySelector('cg-board')?.append(element);
}

function scene(change: Partial<EndScene> = {}): EndScene {
  const main = queryOne(document, 'main', HTMLElement);
  if (!main) throw new Error('no game page');
  return { main, result: 'win', ...change };
}

const postMessage = vi.fn<(message: unknown) => void>();
const posted = (): unknown[] => postMessage.mock.calls.map(([message]) => message);

beforeEach(() => {
  vi.useFakeTimers();
  postMessage.mockClear();
  vi.spyOn(window, 'postMessage').mockImplementation(postMessage);
  localStorage.clear();
  document.body.innerHTML = ROUND;
  addKeyed('square', 'last-move', 'e2');
  addKeyed('square', 'last-move', 'e4');
  addKeyed('piece', 'white pawn', 'e4');
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('the end’s animation', () => {
  it('throws confetti over the board if picked, and tells the content script nothing', () => {
    localStorage.setItem(StorageKey.endAnimation, 'confetti');
    playEndAnimation(scene());
    expect(
      document.querySelectorAll('main > .ln-ext-end-fx .ln-ext-confetti__piece').length,
    ).toBeGreaterThan(0);
    expect(posted()).toEqual([]);
  });

  it('has the board’s wave ring out of the last move’s square by default, after a win only', () => {
    playEndAnimation(scene({ result: 'loss' }));
    expect(posted()).toEqual([]);
    playEndAnimation(scene());
    expect(document.querySelector('.ln-ext-confetti')).toBeNull();
    expect(posted()).toEqual([{ type: 'ln-ext:game-end', end: { result: 'win', square: 'e4' } }]);
  });

  it('rings out of the king in check, or the mated king when known, after the results picked', () => {
    localStorage.setItem(StorageKey.endResults, 'all');
    addKeyed('square', 'check', 'g8');
    playEndAnimation(scene({ result: 'loss' }));
    playEndAnimation(scene({ mated: 'e1' }));
    expect(posted()).toEqual([
      { type: 'ln-ext:game-end', end: { result: 'loss', square: 'g8' } },
      { type: 'ln-ext:game-end', end: { result: 'win', square: 'e1' } },
    ]);
  });

  it('plays nothing when the settings say so', () => {
    localStorage.setItem(StorageKey.endAnimation, 'none');
    playEndAnimation(scene());
    expect(document.querySelector('.ln-ext-confetti')).toBeNull();
    expect(posted()).toEqual([]);
  });
});

describe('the result the page shows', () => {
  it('reads the move list’s score for the player, and none for an aborted game', () => {
    const main = queryOne(document, 'main', HTMLElement);
    if (!main) throw new Error('no game page');
    const score = (text: string): void => {
      main.querySelector('.result-wrap')?.remove();
      main.insertAdjacentHTML(
        'beforeend',
        `<div class="result-wrap"><p class="result">${text}</p></div>`,
      );
    };
    score('1-0');
    expect([shownResult(main, 'white'), shownResult(main, 'black')]).toEqual(['win', 'loss']);
    score('½-½');
    expect(shownResult(main, 'black')).toBe('draw');
    score('');
    expect(shownResult(main, 'white')).toBeNull();
  });
});
