import { afterEach, describe, expect, it } from 'vitest';
import { createPlayersSync } from './players.ts';
// The bars as the original filled them.
import legacy from './fixtures/legacy-players.json' with { type: 'json' };

const inner = (selector: string): string | null =>
  document.querySelector(selector)?.innerHTML ?? null;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('analysis player bars', () => {
  it.each(legacy)('fills them as the original did: $name', ({ html, top, bottom }) => {
    const sync = createPlayersSync();
    document.body.innerHTML = html;
    sync();
    expect(inner('main > .ln-ext-player--top')).toBe(top);
    expect(inner('main > .ln-ext-player--bottom')).toBe(bottom);
  });

  it('swaps them when the board flips', () => {
    const sync = createPlayersSync();
    const [rated, flipped] = legacy;
    document.body.innerHTML = rated?.html ?? '';
    sync();
    document.querySelector('.cg-wrap')?.classList.replace('orientation-white', 'orientation-black');
    sync();
    expect(inner('main > .ln-ext-player--top')).toBe(flipped?.top);
    expect(document.querySelectorAll('.ln-ext-player')).toHaveLength(2);
  });

  it('leaves the bars alone while nothing changed', () => {
    const sync = createPlayersSync();
    document.body.innerHTML = legacy[0]?.html ?? '';
    sync();
    const link = document.querySelector('.ln-ext-player--top > a');
    sync();
    expect(document.querySelector('.ln-ext-player--top > a')).toBe(link);
  });
});
