import { afterEach, describe, expect, it } from 'vitest';
import { sanMarkup } from './title.ts';

afterEach(() => {
  document.body.className = '';
});

describe('sanMarkup', () => {
  it('draws the move’s piece as a figurine', () => {
    expect(sanMarkup('Nxe5+').value).toBe('<span class="ln-ext-fig">♞</span>xe5+');
  });

  it('keeps the letters with Lichess’s piece notation set to them', () => {
    document.body.className = 'piece-letter';
    expect(sanMarkup('Nxe5+').value).toBe('Nxe5+');
    expect(sanMarkup('e8=Q#').value).toBe('e8=Q#');
  });
});
