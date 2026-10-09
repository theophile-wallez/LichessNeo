import { describe, expect, it } from 'vitest';
import { confettiEndMs, confettiMarkup, confettiPieces } from './confetti.ts';

// A fixed run of draws, so the pieces are the same on every run.
function sequence(values: readonly number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
}

describe('confetti', () => {
  it('draws each piece within the board and the shower’s time', () => {
    const pieces = confettiPieces(40, sequence([0, 0.25, 0.5, 0.75, 0.999]));
    expect(pieces).toHaveLength(40);
    for (const piece of pieces) {
      expect(piece.x).toBeGreaterThanOrEqual(0);
      expect(piece.x).toBeLessThan(100);
      expect(piece.delayMs + piece.durationMs).toBeLessThanOrEqual(700 + 3400);
    }
    expect(new Set(pieces.map(piece => piece.shape))).toEqual(new Set(['strip', 'dot', 'curl']));
  });

  it('ends when the last piece lands', () => {
    const pieces = confettiPieces(3, sequence([0.5]));
    expect(confettiEndMs(pieces)).toBe(350 + 2800);
    expect(confettiEndMs([])).toBe(0);
  });

  it('gives each piece its numbers as CSS variables', () => {
    const [piece] = confettiPieces(1, sequence([0.5]));
    if (!piece) throw new Error('no piece');
    const root = document.createElement('div');
    root.innerHTML = confettiMarkup([piece]).value;
    const element = root.querySelector('.lr-ext-confetti > .lr-ext-confetti__piece--dot');
    expect(element?.getAttribute('style')).toBe(
      '--x:50.0;--drift:0.0;--spin:0.00;--size:1.20;--delay:350ms;--fall:2800ms;--c:#f7f3e8',
    );
  });
});
