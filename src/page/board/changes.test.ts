import { afterEach, describe, expect, it } from 'vitest';
import { mayChangeShapes } from './changes.ts';
import { renderBoard } from './fixtures/board-markup.ts';

/** The records a change makes, as the observer gets them. */
function recordsOf(change: () => void): MutationRecord[] {
  const observer = new MutationObserver(() => {});
  observer.observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
  change();
  const records = observer.takeRecords();
  observer.disconnect();
  return records;
}

const changesShapes = (change: () => void): boolean => recordsOf(change).some(mayChangeShapes);

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.className = '';
});

describe('mayChangeShapes', () => {
  it('takes a board appearing, or anything drawn inside it', () => {
    expect(changesShapes(() => renderBoard({ orientation: 'white' }))).toBe(true);
    const container = renderBoard({ orientation: 'white' });
    const svg = container.querySelector('svg.cg-shapes g');
    expect(changesShapes(() => svg?.append(document.createElement('g')))).toBe(true);
    expect(
      changesShapes(() =>
        container.querySelector('cg-board')?.append(document.createElement('piece')),
      ),
    ).toBe(true);
  });

  it('takes the board turning round and the review changing mode', () => {
    renderBoard({ orientation: 'white' });
    const wrap = document.querySelector('.cg-wrap');
    expect(
      changesShapes(() => wrap?.classList.replace('orientation-white', 'orientation-black')),
    ).toBe(true);
    expect(changesShapes(() => document.documentElement.classList.add('lr-ext-review-moves'))).toBe(
      true,
    );
  });

  it('ignores the rest of the page: a clock ticking, a chat line', () => {
    renderBoard({ orientation: 'white' });
    const clock = document.createElement('div');
    clock.className = 'rclock';
    clock.textContent = '1:00';
    document.querySelector('main')?.append(clock);
    expect(changesShapes(() => (clock.textContent = '0:59'))).toBe(false);
    expect(changesShapes(() => clock.classList.add('running'))).toBe(false);
    expect(changesShapes(() => document.body.append(document.createElement('div')))).toBe(false);
  });
});
