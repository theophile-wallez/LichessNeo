import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { historyPage, lichessSession } from '#content/puzzle-dashboard/fixtures/history.ts';
import { decorateSessions } from './sessions.ts';

const NOW = new Date(2026, 9, 12, 12);
const hoursAgo = (hours: number): Date => new Date(NOW.getTime() - hours * 3_600_000);

beforeEach(() => {
  document.documentElement.lang = 'en';
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.lang = '';
});

// The headings and the sessions' scores, in the page's order.
const shown = (box: HTMLElement): string[] =>
  queryAll(box, '.ln-ext-phist__day, .ln-ext-phist__score', HTMLElement).map(element =>
    element.matches('.ln-ext-phist__day')
      ? `# ${element.textContent}`
      : `${element.dataset.lnExtTier} ${element.querySelector('b')?.textContent}`,
  );

describe('the history’s sessions', () => {
  it('get their score, and a heading over each day’s first', () => {
    const box = historyPage(
      lichessSession(hoursAgo(1), [
        { id: 'a', solved: true },
        { id: 'b', solved: true },
      ]),
      lichessSession(hoursAgo(2), [{ id: 'c', solved: false }]),
      lichessSession(hoursAgo(30), [
        { id: 'd', solved: true },
        { id: 'e', solved: false },
      ]),
    );
    decorateSessions(box, NOW);
    expect(shown(box)).toEqual(['# Today', 'up 2/2', 'down 0/1', '# Yesterday', 'even 1/2']);
    const dots = queryAll(box, '.ln-ext-phist__dots > i', HTMLElement);
    expect(dots.map(dot => dot.dataset.lnExtSolved !== undefined)).toEqual([
      true,
      true,
      false,
      true,
      false,
    ]);
  });

  it('decorate only the sessions the infinite scroll adds, under the day they continue', () => {
    const box = historyPage(lichessSession(hoursAgo(30), [{ id: 'a', solved: true }]));
    decorateSessions(box, NOW);
    const more = document.createElement('div');
    setHtml(
      more,
      html`${lichessSession(hoursAgo(31), [{ id: 'b', solved: false }])}
        ${lichessSession(hoursAgo(80), [{ id: 'c', solved: true }])}`,
    );
    box.querySelector('.infinite-scroll')?.append(...more.children);
    decorateSessions(box, NOW);
    expect(shown(box)).toEqual(['# Yesterday', 'up 1/1', 'down 0/1', '# Friday', 'up 1/1']);
  });
});
