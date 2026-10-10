import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { CLASS_COLORS } from '#page/review/classes/classes.ts';
import { cardMarkup, endCardInput } from './card.ts';
import { CHIP_STAGGER_MS, createChips, rolled } from './chips.ts';
import { gameOverTexts } from './texts.ts';

const texts = gameOverTexts();

function counts(): HTMLElement {
  const root = document.createElement('div');
  setHtml(
    root,
    cardMarkup(
      endCardInput({
        outcome: { result: 'win', reason: 'mate', winner: 'white' },
        texts,
        coachId: 1,
        opponent: 'bob',
      }),
    ),
  );
  const element = queryOne(root, '.lr-ext-end__counts', HTMLElement);
  if (!element) throw new Error('no counts');
  return element;
}

const numbers = (root: HTMLElement): string[] =>
  queryAll(root, '.lr-ext-end__count b', HTMLElement).map(number => number.textContent);

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
    expect(root.classList.contains('lr-ext-end__counts--spinning')).toBe(true);
    expect(root.querySelectorAll('.lr-ext-end__count-icon svg')).toHaveLength(3);
    chips.stop();
    expect(root.classList.contains('lr-ext-end__counts--spinning')).toBe(false);
  });

  it('come in one after another, each number rolling up to the count', () => {
    const root = counts();
    const chips = createChips(root);
    chips.spin();
    chips.reveal(
      { accuracy: 90, counts: { best: 26, excellent: 12, miss: 1 }, firstPlies: {} },
      texts,
    );
    expect(root.classList.contains('lr-ext-end__counts--spinning')).toBe(false);
    expect(root.classList.contains('lr-ext-end__counts--revealed')).toBe(true);
    expect(numbers(root)).toEqual(['0', '0', '0']);
    vi.advanceTimersByTime(700 + 3 * CHIP_STAGGER_MS);
    expect(numbers(root)).toEqual(['26', '12', '1']);
    const labels = queryAll(root, '.lr-ext-end__count-label', HTMLElement).map(
      label => label.textContent,
    );
    expect(labels).toEqual(['best moves', 'excellent moves', 'miss']);
    const [best] = queryAll(root, '.lr-ext-end__count', HTMLElement);
    expect(best?.style.getPropertyValue('--lr-ext-count-c')).toBe(CLASS_COLORS.best);
  });

  it('change in place to other counts, even mid-roll', () => {
    const root = counts();
    const chips = createChips(root);
    chips.reveal(
      { accuracy: 90, counts: { best: 26, excellent: 12, miss: 1 }, firstPlies: {} },
      texts,
    );
    vi.advanceTimersByTime(200);
    chips.update(
      { accuracy: 88, counts: { best: 24, excellent: 13, mistake: 2 }, firstPlies: {} },
      texts,
    );
    expect(numbers(root)).toEqual(['24', '13', '2']);
    vi.advanceTimersByTime(2000);
    expect(numbers(root)).toEqual(['24', '13', '2']);
    const labels = queryAll(root, '.lr-ext-end__count-label', HTMLElement).map(
      label => label.textContent,
    );
    expect(labels).toEqual(['best moves', 'excellent moves', 'mistakes']);
  });

  it("lead to the review on each class's first move, once Lichess's analysis link is there", () => {
    document.body.innerHTML = `<main class="round"><div class="rcontrols"><div class="follow-up">
      <button class="fbt rematch">Rematch</button><a class="fbt" href="/abcd1234/white">Analysis</a>
    </div></div></main>`;
    const root = counts();
    createChips(root).reveal(
      {
        accuracy: 90,
        counts: { best: 26, excellent: 12, miss: 1 },
        firstPlies: { best: 3, miss: 21 },
      },
      texts,
    );
    const links = queryAll(root, '.lr-ext-end__count', HTMLElement).map(chip =>
      chip.getAttribute('href'),
    );
    expect(links).toEqual(['/abcd1234/white#3', null, '/abcd1234/white#21']);
    document.body.innerHTML = '';
  });
});
