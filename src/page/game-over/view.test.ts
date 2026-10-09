import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import type { Outcome } from './outcome.ts';
import { gameOverTexts } from './texts.ts';
import { MIN_SPIN_MS, mountGameOver, SETTLE_MS, type GameOverInput } from './view.ts';

// The game page once the game is over, seen from White, and the follow-up.
const ROUND =
  '<main class="round"><div class="round__app">' +
  '<div class="round__app__board main-board"><div class="cg-wrap orientation-white"><cg-container><cg-board>' +
  '<piece class="white king"></piece><piece class="black king"></piece><piece class="black king ghost"></piece>' +
  '</cg-board></cg-container></div></div>' +
  '<div class="rcontrols"><div class="follow-up"><button class="fbt rematch white"><span>Rematch</span></button>' +
  '<a class="fbt" href="/abcd1234/white#9">Analysis board</a></div></div>' +
  '</div></main>';

const WIN: Outcome = { result: 'win', reason: 'resign', winner: 'white' };

const shownCounts = (): string[] =>
  queryAll(document, '.lr-ext-end__count b', HTMLElement).map(number => number.textContent);

function mount(outcome: Outcome): ReturnType<typeof mountGameOver> {
  const main = queryOne(document, 'main.round', HTMLElement);
  if (!main) throw new Error('no game page');
  const input: GameOverInput = {
    main,
    outcome,
    texts: gameOverTexts(),
    coachId: 2,
    opponent: 'bob',
  };
  return mountGameOver(input);
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = ROUND;
  // Chessground keeps each piece's square in an expando.
  const [white, black] = queryAll(document, 'piece', HTMLElement);
  Object.assign(white ?? {}, { cgKey: 'e1' });
  Object.assign(black ?? {}, { cgKey: 'g8' });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('the game over', () => {
  it('badges each king on its square, over Lichess’s own badges', () => {
    mount(WIN);
    const main = queryOne(document, 'main.round', HTMLElement);
    expect(main?.dataset.lrExtEnd).toBe('');
    const kings = queryAll(document, 'main.round > .lr-ext-end .lr-ext-end__king', HTMLElement);
    expect(kings.map(king => [king.className, king.getAttribute('style')])).toEqual([
      ['lr-ext-end__king lr-ext-end__king--win', '--column:4;--row:7'],
      ['lr-ext-end__king lr-ext-end__king--loss lr-ext-end__king--below', '--column:6;--row:0'],
    ]);
  });

  it('follows the kings when the board turns round', () => {
    mount(WIN);
    document.querySelector('.cg-wrap')?.classList.replace('orientation-white', 'orientation-black');
    vi.advanceTimersByTime(250);
    const white = document.querySelector('.lr-ext-end__king--win');
    expect(white?.getAttribute('style')).toBe('--column:3;--row:0');
  });

  it('throws confetti for the winner only', () => {
    mount(WIN);
    expect(document.querySelectorAll('.lr-ext-confetti__piece').length).toBeGreaterThan(0);
    vi.advanceTimersByTime(5000);
    expect(document.querySelector('.lr-ext-confetti')).toBeNull();
    document.body.innerHTML = ROUND;
    mount({ result: 'loss', reason: 'mate', winner: 'black' });
    expect(document.querySelector('.lr-ext-confetti')).toBeNull();
  });

  it('shows the large badges a moment, then the card as they shrink to pips', async () => {
    mount(WIN);
    const layer = document.querySelector('main.round > .lr-ext-end');
    expect(layer?.classList.contains('lr-ext-end--settled')).toBe(false);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(layer?.classList.contains('lr-ext-end--settled')).toBe(true);
    expect(document.querySelector('.lr-ext-end__title')?.textContent).toBe('You beat bob!');
  });

  it('has the coach spin the counts, then count the moves and speak', async () => {
    const posted = vi.spyOn(window, 'postMessage');
    const view = mount(WIN);
    view.analysing();
    view.verdict({
      accuracy: 91.24,
      counts: { best: 12, excellent: 3, mistake: 1 },
      firstPlies: {},
    });
    const bubble = document.querySelector('.lr-ext-end__bubble');
    const counts = document.querySelector('.lr-ext-end__counts');
    expect(bubble?.textContent).toBe('');
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(bubble?.textContent).toBe('One moment while your Game Review loads…');
    expect(counts?.classList.contains('lr-ext-end__counts--spinning')).toBe(true);
    // The moves were counted at once, yet the counts spin a moment.
    await vi.advanceTimersByTimeAsync(MIN_SPIN_MS);
    expect(counts?.classList.contains('lr-ext-end__counts--revealed')).toBe(true);
    await vi.advanceTimersByTimeAsync(3000);
    const numbers = queryAll(document, '.lr-ext-end__count b', HTMLElement).map(
      number => number.textContent,
    );
    expect(numbers).toEqual(['12', '3', '1']);
    expect(bubble?.textContent).toBe('Well played! You played with 91.2% accuracy.');
    expect(posted.mock.calls.at(-1)?.[0]).toMatchObject({
      coach: 2,
      mood: 'happy',
      talking: false,
    });
  });

  it('takes the review’s figures once its analysis is done, where they differ', async () => {
    const posted = vi.spyOn(window, 'postMessage');
    const view = mount(WIN);
    view.analysing();
    view.verdict({
      accuracy: 91.24,
      counts: { best: 12, excellent: 3, mistake: 1 },
      firstPlies: {},
    });
    await vi.advanceTimersByTimeAsync(SETTLE_MS + MIN_SPIN_MS + 3000);
    const bubble = document.querySelector('.lr-ext-end__bubble');
    // Figures that read the same leave the card, and the coach, alone.
    const said = posted.mock.calls.length;
    view.refine({ accuracy: 91.2, counts: { best: 12, excellent: 3, mistake: 1 }, firstPlies: {} });
    await vi.advanceTimersByTimeAsync(0);
    expect(posted.mock.calls).toHaveLength(said);
    view.refine({ accuracy: 89.6, counts: { best: 11, excellent: 3, mistake: 2 }, firstPlies: {} });
    await vi.advanceTimersByTimeAsync(0);
    expect(shownCounts()).toEqual(['11', '3', '2']);
    expect(bubble?.textContent).toBe('Well played! You played with 89.6% accuracy.');
  });

  it('drops the counts when it couldn’t look', async () => {
    const view = mount(WIN);
    view.analysing();
    view.failed();
    await vi.advanceTimersByTimeAsync(SETTLE_MS + MIN_SPIN_MS);
    expect(document.querySelector('.lr-ext-end__counts')).toBeNull();
    expect(document.querySelector('.lr-ext-end__bubble')?.textContent).toBe(gameOverTexts().failed);
  });

  it('leads to the review and presses Lichess’s buttons', () => {
    mount(WIN);
    const review = document.querySelector('.lr-ext-end__review');
    expect(review?.getAttribute('href')).toBe('/abcd1234/white#9');
    const rematch = vi.fn<() => void>();
    document.querySelector('.follow-up .rematch')?.addEventListener('click', rematch);
    queryOne(document, '.lr-ext-end__btn[data-lr-ext-end="rematch"]', HTMLElement)?.click();
    expect(rematch).toHaveBeenCalledOnce();
  });

  it('closes the card and keeps the badges', () => {
    mount(WIN);
    queryOne(document, '.lr-ext-end__close', HTMLElement)?.click();
    expect(document.querySelector('.lr-ext-end__card')).toBeNull();
    expect(document.querySelectorAll('.lr-ext-end__king')).toHaveLength(2);
  });
});
