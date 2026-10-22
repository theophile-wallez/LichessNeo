import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { insights } from './index.ts';

// The feature on the markup Lichess serves: the answer it fetches, drawn into
// the box its canvas sits in.

const ANSWER = {
  question: { dimension: 'piece', metric: 'accuracy' },
  xAxis: { name: 'Piece moved', categories: ['Pawn', 'Knight'], dataType: 'text' },
  valueYaxis: { name: 'Accuracy', dataType: 'percent' },
  sizeYaxis: { name: 'Number of moves', dataType: 'count' },
  series: [{ name: 'Accuracy', dataType: 'percent', data: [80, 60] }],
  sizeSerie: { name: 'Number of moves', dataType: 'count', data: [3, 1] },
  games: [],
};

const PAGE =
  '<main id="insight"><div class="ready">' +
  '<div><div class="info box"><div class="top">Alex</div></div></div><span></span>' +
  '<div><header><h2 class="text" data-icon="">Chess Insights</h2>' +
  '<div class="axis-form"></div></header>' +
  '<div class="insight__main box"><div class="chart"><canvas class="chart"></canvas></div>' +
  '<div class="hscroll"><table class="slist"></table></div></div></div>' +
  '</div></main>';

/** The page's own fetch, which the feature wraps: it answers every request. */
function stubFetch(body: string): void {
  window.fetch = () => Promise.resolve(new Response(body));
}

const ask = async (path = '/insights/data/Eresy'): Promise<void> => {
  await window.fetch(path);
  // The body is read off a clone, a microtask later.
  await Promise.resolve();
  await Promise.resolve();
};

const chartBox = (): HTMLElement | null => queryOne(document, '.insight__main .chart', HTMLElement);
const ours = (): HTMLElement | null => queryOne(document, '.ln-ext-ins', HTMLElement);

beforeEach(() => {
  history.pushState({}, '', '/insights/Eresy/accuracy/piece');
  document.documentElement.lang = 'en';
  document.body.innerHTML = PAGE;
});

afterEach(() => {
  document.body.innerHTML = '';
  history.pushState({}, '', '/');
});

describe('the insights chart', () => {
  it('draws the answer into the box, and hides Lichess’s canvas', async () => {
    stubFetch(JSON.stringify(ANSWER));
    insights.start();
    await ask();
    expect(chartBox()?.classList.contains('ln-ext-ins-on')).toBe(true);
    expect(queryOne(document, '.ln-ext-ins__svg', Element)).not.toBeNull();
  });

  it('draws a row per category, with its name beside the plot', async () => {
    stubFetch(JSON.stringify(ANSWER));
    insights.start();
    await ask();
    const labels = [...document.querySelectorAll('.ln-ext-ins__label')].map(
      label => label.textContent,
    );
    expect(labels).toEqual(['Pawn', 'Knight']);
    expect(ours()?.innerHTML).toContain('data-ln-ext-row="1"');
  });

  it('writes the player’s own weighted average, as a line and as a chip', async () => {
    stubFetch(JSON.stringify(ANSWER));
    insights.start();
    await ask();
    // (80 × 3 + 60 × 1) / 4 moves.
    expect(queryOne(document, '.ln-ext-ins__legend', HTMLElement)?.textContent).toBe('Average75%');
    expect(ours()?.innerHTML).toContain('ln-ext-ins__avg');
  });

  it('writes its numbers in the page’s language', async () => {
    document.documentElement.lang = 'fr';
    stubFetch(JSON.stringify(ANSWER));
    insights.start();
    await ask();
    const legend = queryOne(document, '.ln-ext-ins__legend', HTMLElement);
    // French puts a no-break space before the sign, as Intl writes it.
    expect(legend?.textContent).toBe('Moyenne75 %');
  });

  it('shows what a row stands on when the pointer is over it', async () => {
    stubFetch(JSON.stringify(ANSWER));
    insights.start();
    await ask();
    const svg = queryOne(document, '.ln-ext-ins__svg', Element);
    svg?.dispatchEvent(new MouseEvent('pointermove', { clientX: 10, clientY: 10 }));
    const tip = queryOne(document, '.ln-ext-ins__tip', HTMLElement);
    expect(tip?.classList.contains('ln-ext-rchart__tip--on')).toBe(true);
    expect(tip?.textContent).toContain('Pawn');
    expect(tip?.textContent).toContain('Number of moves');
    expect(tip?.textContent).toContain('3');
  });

  it('prefixes everything it adds with ln-ext', async () => {
    stubFetch(JSON.stringify(ANSWER));
    insights.start();
    await ask();
    const added: string[] = [];
    for (const node of ours()?.querySelectorAll('[class]') ?? []) added.push(...node.classList);
    expect(added.length).toBeGreaterThan(0);
    expect(added.every(name => name.startsWith('ln-ext'))).toBe(true);
  });

  it('leaves the page alone when the answer is not one', async () => {
    stubFetch('{"nope":true}');
    insights.start();
    await ask();
    expect(ours()).toBeNull();
    expect(chartBox()?.classList.contains('ln-ext-ins-on')).toBe(false);
  });

  it('reads no request but the page’s question', async () => {
    stubFetch(JSON.stringify(ANSWER));
    insights.start();
    await ask('/api/something-else');
    expect(ours()).toBeNull();
  });

  it('mounts once the answer’s box shows, which a phone only draws on demand', async () => {
    const main = queryOne(document, 'main#insight', HTMLElement);
    const box = queryOne(document, '.insight__main', HTMLElement);
    box?.remove();
    stubFetch(JSON.stringify(ANSWER));
    insights.start();
    await ask();
    expect(ours()).toBeNull();
    // The user picks the Insights view, long after the answer came.
    if (main && box) main.append(box);
    await Promise.resolve();
    expect(ours()).not.toBeNull();
  });

  it('stays out of every other page', async () => {
    history.pushState({}, '', '/@/Eresy');
    const page = window.fetch;
    insights.start();
    expect(window.fetch).toBe(page);
  });
});
