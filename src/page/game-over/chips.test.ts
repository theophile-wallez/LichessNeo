import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { cardMarkup } from './card.ts';
import { CHIP_STAGGER_MS, createChips, rolled } from './chips.ts';
import { gameOverTexts } from './texts.ts';

const texts = gameOverTexts();

function counts(): HTMLElement {
  const root = document.createElement('div');
  setHtml(
    root,
    cardMarkup({
      outcome: { result: 'win', reason: 'mate', winner: 'white' },
      texts,
      coachId: 1,
      opponent: 'bob',
    }),
  );
  const element = queryOne(root, '.cdc-end__counts', HTMLElement);
  if (!element) throw new Error('no counts');
  return element;
}

const numbers = (root: HTMLElement): string[] =>
  queryAll(root, '.cdc-end__count b', HTMLElement).map(number => number.textContent);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('rolled', () => {
  it('rolls a number up to its count over the roll', () => {
    expect([-100, 0, 350, 700, 2000].map(elapsed => rolled(26, elapsed))).toEqual([
      0, 0, 13, 26, 26,
    ]);
  });
});

describe('the counts', () => {
  it('spin through the classes while the moves are looked at', () => {
    const root = counts();
    const chips = createChips(root);
    chips.spin();
    expect(root.classList.contains('cdc-end__counts--spinning')).toBe(true);
    expect(root.querySelectorAll('.cdc-end__count-icon svg')).toHaveLength(3);
    chips.stop();
    expect(root.classList.contains('cdc-end__counts--spinning')).toBe(false);
  });

  it('come in one after another, each number rolling up to the count', () => {
    const root = counts();
    const chips = createChips(root);
    chips.spin();
    chips.reveal({ accuracy: 90, counts: { best: 26, excellent: 12, miss: 1 } }, texts);
    expect(root.classList.contains('cdc-end__counts--spinning')).toBe(false);
    expect(root.classList.contains('cdc-end__counts--revealed')).toBe(true);
    expect(numbers(root)).toEqual(['0', '0', '0']);
    vi.advanceTimersByTime(700 + 3 * CHIP_STAGGER_MS);
    expect(numbers(root)).toEqual(['26', '12', '1']);
    const labels = queryAll(root, '.cdc-end__count-label', HTMLElement).map(
      label => label.textContent,
    );
    expect(labels).toEqual(['best moves', 'excellent moves', 'miss']);
    const [best] = queryAll(root, '.cdc-end__count', HTMLElement);
    expect(best?.style.getPropertyValue('--cdc-count-c')).toBe('#4caa48');
  });

  it('change in place to other counts, even mid-roll', () => {
    const root = counts();
    const chips = createChips(root);
    chips.reveal({ accuracy: 90, counts: { best: 26, excellent: 12, miss: 1 } }, texts);
    vi.advanceTimersByTime(200);
    chips.update({ accuracy: 88, counts: { best: 24, excellent: 13, mistake: 2 } }, texts);
    expect(numbers(root)).toEqual(['24', '13', '2']);
    vi.advanceTimersByTime(2000);
    expect(numbers(root)).toEqual(['24', '13', '2']);
    const labels = queryAll(root, '.cdc-end__count-label', HTMLElement).map(
      label => label.textContent,
    );
    expect(labels).toEqual(['best moves', 'excellent moves', 'mistakes']);
  });
});
