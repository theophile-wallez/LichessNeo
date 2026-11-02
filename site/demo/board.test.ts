import { afterEach, describe, expect, it } from 'vitest';
import { DemoBoard } from './board.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_NF3 = 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1';

afterEach(() => document.body.replaceChildren());

// The pieces on `file`, from the bottom: their side, the square's color and their ring's mask.
function marks(host: Element, x: number) {
  return [...host.querySelectorAll<HTMLElement>('.demo-piece')]
    .filter(piece => piece.style.getPropertyValue('--x') === String(x))
    .toSorted(
      (one, other) =>
        Number(other.style.getPropertyValue('--y')) - Number(one.style.getPropertyValue('--y')),
    )
    .map(piece => [
      piece.dataset.side,
      piece.dataset.square,
      piece.style.getPropertyValue('--ring-mask'),
    ]);
}

describe('the demo’s board', () => {
  it('marks each piece with its side and its square’s color, the ring’s own', () => {
    const host = document.body.appendChild(document.createElement('div'));
    const board = new DemoBoard(host);
    board.show(START);
    expect(marks(host, 4)).toEqual([
      ['white', 'dark', 'var(--ring-wK)'],
      ['white', 'light', 'var(--ring-wP)'],
      ['black', 'dark', 'var(--ring-bP)'],
      ['black', 'light', 'var(--ring-bK)'],
    ]);
    // The knight keeps its element, and takes its new square's color: from g1 to f3.
    expect(marks(host, 6)[0]).toEqual(['white', 'dark', 'var(--ring-wN)']);
    board.show(AFTER_NF3);
    expect(marks(host, 5)[2]).toEqual(['white', 'light', 'var(--ring-wN)']);
  });
});
