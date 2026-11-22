import { describe, expect, it } from 'vitest';
import { overMarkup, shownOf } from './overlays.ts';
import { moves } from './review.ts';

const overAt = (ply: number): HTMLElement => {
  const move = moves[ply - 1];
  if (!move) throw new Error(`no move at ply ${ply}`);
  const host = document.createElement('div');
  host.innerHTML = overMarkup(shownOf(move)).value;
  return host;
};

describe('what the demo draws over the pieces', () => {
  it('bursts a brilliant move’s square under its badge, as the review’s board does', () => {
    const over = overAt(19);
    const burst = over.querySelector('.ln-ext-burst');
    // 10.Nxb5: the b file's column, the fifth rank's row from the top.
    expect(burst?.getAttribute('style')).toContain('--ln-ext-burst-x:12.5%;--ln-ext-burst-y:37.5%');
    expect(burst?.nextElementSibling?.classList.contains('ln-ext-badge')).toBe(true);
  });

  it('bursts no other class', () => {
    expect(overAt(27).querySelector('.ln-ext-badge')).not.toBeNull();
    expect(overAt(27).querySelector('.ln-ext-burst')).toBeNull();
  });
});
