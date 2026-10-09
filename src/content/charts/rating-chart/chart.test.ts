import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod/mini';
import { unprefixedNames, withLegacyNames } from '#shared/charts/fixtures/names.ts';
import { queryAll, queryOne } from '#shared/dom.ts';
import { StorageKey } from '#shared/storage.ts';
import { fakeLayout } from '#shared/testing/layout.ts';
import { RANGE_KEYS } from './dates.ts';
import { ratingChart } from './index.ts';
// What the original script drew through the same clicks, hovers and resizes.
import legacy from './fixtures/legacy-chart.json' with { type: 'json' };

const ActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('mount') }),
  z.object({ type: z.literal('resize'), width: z.number() }),
  z.object({ type: z.literal('range'), key: z.string() }),
  z.object({ type: z.literal('chip'), i: z.number() }),
  z.object({ type: z.literal('hover'), clientX: z.number() }),
  z.object({ type: z.literal('leave') }),
]);
type Action = z.infer<typeof ActionSchema>;

let plotWidth = 640;

// The element sizes used when the original's output was recorded.
function stubLayout() {
  return fakeLayout((element, metric) => {
    const range = element.dataset.lrExtRange;
    if (metric === 'clientWidth') return element.matches('.lr-ext-rchart__plot') ? plotWidth : 0;
    if (metric === 'offsetWidth' && element.matches('.lr-ext-rchart__tip')) return 120;
    if (range === undefined) return 0;
    if (metric === 'offsetWidth') return 30 + 4 * range.length;
    if (metric === 'offsetHeight') return 28;
    if (metric === 'offsetLeft') return 3 + 44 * RANGE_KEYS.findIndex(key => key === range);
    return metric === 'offsetTop' ? 3 : 0;
  });
}

function click(root: Element, selector: string): void {
  root.querySelector(selector)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function act(action: Action, host: Element, resize: () => void): void {
  const root = queryOne(host, '.lr-ext-rchart', HTMLElement);
  const svg = root?.querySelector('svg');
  if (!root || !svg) throw new Error('no chart');
  switch (action.type) {
    case 'mount':
      return;
    case 'resize':
      plotWidth = action.width;
      resize();
      return;
    case 'range':
      click(root, `[data-lr-ext-range="${action.key}"]`);
      return;
    case 'chip':
      click(root, `.lr-ext-rchart__chip[data-lr-ext-series="${action.i}"]`);
      return;
    case 'hover':
      svg.dispatchEvent(new PointerEvent('pointermove', { clientX: action.clientX }));
      return;
    case 'leave':
      svg.dispatchEvent(new PointerEvent('pointerleave'));
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(legacy.now);
  plotWidth = 640;
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  document.documentElement.lang = '';
  document.body.replaceChildren();
});

interface Scenario {
  readonly lang: string;
  readonly json: unknown;
  readonly stored: string | null;
}

/** Lichess's card, with our chart mounted in it. */
function mount({ lang, json, stored }: Scenario): { host: Element; resize: () => void } {
  const { resize } = stubLayout();
  document.documentElement.lang = lang;
  if (stored !== null) localStorage.setItem(StorageKey.ratingChartRange, stored);
  document.body.innerHTML =
    '<div class="rating-history-container"><div class="rating-history-container"><canvas></canvas></div></div>' +
    `<script id="page-init-data" type="application/json">${JSON.stringify(json)}</script>`;
  ratingChart.start();
  const host = document.querySelector('.rating-history-container');
  if (!host) throw new Error('no host');
  return { host, resize };
}

describe('the rating chart', () => {
  it.each(legacy.scenarios.map(scenario => [scenario.name, scenario]))(
    'draws the %s scenario as the original did',
    (_, scenario) => {
      const { host, resize } = mount(scenario);
      let expected = '';
      for (const snapshot of scenario.snapshots) {
        act(ActionSchema.parse(snapshot.action), host, resize);
        expected = snapshot.html ?? expected;
        expect(withLegacyNames(host.outerHTML)).toBe(expected);
        expect(localStorage.getItem(StorageKey.ratingChartRange)).toBe(snapshot.stored);
      }
    },
  );

  it('prefixes its data attributes and CSS variables with lr-ext', () => {
    const [scenario] = legacy.scenarios;
    if (!scenario) throw new Error('no scenario');
    const { host, resize } = mount(scenario);
    act({ type: 'resize', width: 640 }, host, resize);
    act({ type: 'hover', clientX: 300 }, host, resize);
    const chart = host.querySelector('.lr-ext-rchart');
    if (!chart) throw new Error('no chart');
    expect(unprefixedNames(chart)).toEqual([]);
    // The stylesheet and chart.ts read these names: check they're on the right elements.
    const series = [
      ...queryAll(chart, '.lr-ext-rchart__chip', HTMLElement),
      ...queryAll(chart, '.lr-ext-rchart__series, .lr-ext-rchart__dot', SVGElement),
    ];
    expect(series.length).toBeGreaterThan(0);
    for (const element of series) {
      expect(element.getAttribute('style')).toMatch(/^--lr-ext-series-color:#[0-9a-f]{6}$/);
      expect(element.dataset.lrExtSeries).toMatch(/^\d+$/);
    }
    const tipRows = chart.querySelectorAll('.lr-ext-rchart__tiprow');
    expect(tipRows.length).toBeGreaterThan(0);
    for (const row of tipRows)
      expect(row.getAttribute('style')).toMatch(/^--lr-ext-series-color:#[0-9a-f]{6}$/);
    const ranges = queryAll(chart, '.lr-ext-rchart__ranges button', HTMLElement);
    expect(ranges.map(button => button.dataset.lrExtRange)).toEqual(RANGE_KEYS);
  });
});
