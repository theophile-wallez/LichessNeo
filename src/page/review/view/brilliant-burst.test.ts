import { afterEach, describe, expect, it } from 'vitest';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import { renderBoard } from './board.ts';
import { burstMarkup } from './brilliant-burst.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
  localStorage.clear();
  document.documentElement.className = '';
});

const parsed = (markup: string): HTMLElement => {
  const host = document.createElement('div');
  host.innerHTML = markup;
  const burst = host.firstElementChild;
  if (!(burst instanceof HTMLElement)) throw new Error('No burst');
  return burst;
};

describe('a brilliant move’s burst', () => {
  it('starts from the landing square, with its glow and twelve sparks', () => {
    const burst = parsed(burstMarkup([5, 2])?.value ?? '');
    expect(burst.style.getPropertyValue('--ln-ext-burst-x')).toBe('62.5%');
    expect(burst.style.getPropertyValue('--ln-ext-burst-y')).toBe('25%');
    expect(burst.querySelectorAll('.ln-ext-burst__glow')).toHaveLength(1);
    expect(burst.querySelectorAll('.ln-ext-burst__spark svg')).toHaveLength(12);
  });

  it('sends its sparks every way, every other one farther', () => {
    const sparks = [...parsed(burstMarkup([3, 3])?.value ?? '').querySelectorAll('span')]
      .filter(spark => spark.classList.contains('ln-ext-burst__spark'))
      .map(spark => ({
        x: Number.parseFloat(spark.style.getPropertyValue('--ln-ext-burst-dx')),
        y: Number.parseFloat(spark.style.getPropertyValue('--ln-ext-burst-dy')),
      }));
    expect(sparks.some(({ x }) => x > 0) && sparks.some(({ x }) => x < 0)).toBe(true);
    expect(sparks.some(({ y }) => y > 0) && sparks.some(({ y }) => y < 0)).toBe(true);
    const [far, near] = sparks.map(({ x, y }) => Math.hypot(x, y));
    expect(far).toBeGreaterThan(near ?? Infinity);
  });

  it('draws the same markup every time, or it would play again on every render', () => {
    expect(burstMarkup([0, 7])?.value).toBe(burstMarkup([0, 7])?.value);
  });

  it('draws nothing for a move with no square to land on', () => {
    expect(burstMarkup([-1, Number.NaN])).toBeNull();
    expect(burstMarkup([8, Number.NaN])).toBeNull();
  });
});

/** The opera game as the review judged it, `at` showing a move and reading its class. */
function opera() {
  const game = judgedGame('opera');
  game.session.view.mode = 'moves';
  const at = (ply: number) => {
    game.ctrl.jumpToMain(ply);
    renderBoard(game.session, game.facade);
    return document.documentElement.dataset.lnExtCls;
  };
  return { ...game, at };
}

describe('the burst on the board', () => {
  it('comes under a brilliant move’s badge only', () => {
    const { session, at } = opera();
    const plies = Array.from({ length: 33 }, (_, i) => i + 1);
    const brilliant = plies.find(ply => at(ply) === 'brilliant');
    expect(brilliant).toBeDefined();
    const [burst, badge] = session.elements.overlay.children;
    expect(burst?.classList.contains('ln-ext-burst')).toBe(true);
    expect(badge?.classList.contains('ln-ext-badge')).toBe(true);
    const other = plies.find(ply => at(ply) === 'best');
    expect(other).toBeDefined();
    expect(session.elements.overlay.querySelector('.ln-ext-burst')).toBeNull();
  });

  it('stays put while the move stays on the board, so it plays once', () => {
    const { session, at } = opera();
    const brilliant = Array.from({ length: 33 }, (_, i) => i + 1).find(
      ply => at(ply) === 'brilliant',
    );
    const drawn = session.elements.overlay.querySelector('.ln-ext-burst');
    expect(drawn).not.toBeNull();
    at(brilliant ?? 0);
    expect(session.elements.overlay.querySelector('.ln-ext-burst')).toBe(drawn);
  });
});
