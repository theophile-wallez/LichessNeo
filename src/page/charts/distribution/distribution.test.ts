import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod/mini';
import { unprefixedNames, withLegacyNames } from '#shared/charts/fixtures/names.ts';
import { queryAll } from '#shared/dom.ts';
import { fakeLayout } from '#shared/testing/layout.ts';
import { distribution } from './index.ts';
import { binOf, countPlayers, markersOf, onChart } from './players.ts';
import { columnPath, countScale, layOut, MIN_RATING, PADDING } from './scales.ts';
import { DistributionSchema } from './schema.ts';
// What the original script (before the TypeScript port) made of the same inputs.
import legacy from './fixtures/legacy.json' with { type: 'json' };
import legacyChart from './fixtures/legacy-chart.json' with { type: 'json' };

const ActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('mount') }),
  z.object({ type: z.literal('resize'), width: z.number(), height: z.number() }),
  z.object({ type: z.literal('hover'), clientX: z.number() }),
  z.object({ type: z.literal('leave') }),
]);

const size = { width: 640, height: 360 };

// The element sizes used when the original's output was recorded.
function stubLayout() {
  return fakeLayout((element, metric) => {
    const plot = element.matches('.ln-ext-dist__plot');
    if (metric === 'clientWidth') return plot ? size.width : 0;
    if (metric === 'clientHeight') return plot ? size.height : 0;
    if (metric !== 'offsetWidth') return 0;
    if (element.matches('.ln-ext-rchart__tip')) return 120;
    return element.matches('.ln-ext-dist__mark') ? 60 + 5 * element.textContent.length : 0;
  });
}

interface Page {
  readonly path: string;
  readonly lang: string;
  readonly i18n?: unknown;
  readonly init: string | null;
  readonly host: boolean;
  readonly wrapper: boolean;
}

function setPage({ path, lang, i18n, init, host, wrapper }: Page): void {
  history.pushState({}, '', path);
  document.documentElement.lang = lang;
  window.i18n = i18n;
  const box = host
    ? '<div id="rating_distribution"><canvas></canvas></div>'
    : '<div id="elsewhere"></div>';
  const body = wrapper
    ? `<div class="rating-stats"><h1>Weekly</h1>${box}</div>`
    : `<div class="box">${box}</div>`;
  const data =
    init === null ? '' : `<script id="page-init-data" type="application/json">${init}</script>`;
  document.body.innerHTML = body + data;
}

const pageMarkup = (): string => withLegacyNames(document.body.firstElementChild?.outerHTML ?? '');

afterEach(() => {
  window.i18n = undefined;
  document.documentElement.lang = '';
  document.body.replaceChildren();
  history.pushState({}, '', '/');
});

describe('scales', () => {
  it.each(legacy.niceMax.map(({ max, output }) => [max, output]))(
    'rounds a top of %d as the original did',
    (max, output) => {
      expect(countScale(max)).toEqual({ step: output.step, max: output.hi });
    },
  );

  it.each(legacy.column.map(column => [column.x, column.y, column]))(
    'draws a column at %d,%d as the original did',
    (_, __, { x, y, w, bottom, output }) => {
      expect(columnPath({ x, y, width: w, bottom })).toBe(output);
    },
  );

  it('ends the rating axis where the players’ last column ends', () => {
    const players = countPlayers([5, 10, 20, 10]);
    const geometry = layOut({
      width: 640,
      height: 360,
      counts: players.counts,
      maxRating: players.maxRating,
      markers: 0,
    });
    expect(geometry.x(MIN_RATING)).toBe(PADDING.left);
    expect(geometry.x(onChart(3000, players))).toBe(640 - PADDING.right);
  });
});

describe('players', () => {
  const players = countPlayers([1, 3, 0, 4]);

  it('adds up the shares below each column', () => {
    expect(players.total).toBe(8);
    expect(players.shares).toEqual([0.125, 0.5, 0.5, 1]);
    expect(players.maxRating).toBe(500);
  });

  it('keeps ratings off the chart at its edges', () => {
    expect(binOf(300, players)).toBe(0);
    expect(binOf(449, players)).toBe(1);
    expect(binOf(900, players)).toBe(3);
    expect(onChart(900, players)).toBe(500);
    expect(onChart(100, players)).toBe(400);
  });

  it('marks the other player only with both a rating and a name', () => {
    const data = DistributionSchema.parse({ freq: [1, 2], myRating: 1500, otherRating: 1600 });
    expect(markersOf(data, 'Yours').map(({ kind }) => kind)).toEqual(['mine']);
    const both = DistributionSchema.parse({ freq: [1, 2], otherRating: 1600, otherPlayer: 'X' });
    expect(markersOf(both, 'Yours')).toEqual([
      { kind: 'other', color: '#bab9b8', rating: 1600, label: 'X' },
    ]);
  });
});

describe('the distribution chart', () => {
  it.each(legacyChart.scenarios.map(scenario => [scenario.name, scenario]))(
    'draws the %s scenario as the original did',
    (_, { path, lang, i18n, json, wrapper, snapshots }) => {
      const { resize } = stubLayout();
      setPage({ path, lang, i18n, init: JSON.stringify(json), host: true, wrapper });
      distribution.start();
      let expected = '';
      for (const snapshot of snapshots) {
        const action = ActionSchema.parse(snapshot.action);
        const svg = document.querySelector('#rating_distribution svg');
        if (action.type === 'resize') {
          size.width = action.width;
          size.height = action.height;
          resize();
        } else if (action.type === 'hover') {
          svg?.dispatchEvent(new PointerEvent('pointermove', { clientX: action.clientX }));
        } else if (action.type === 'leave') {
          svg?.dispatchEvent(new PointerEvent('pointerleave'));
        }
        expected = snapshot.html ?? expected;
        expect(pageMarkup()).toBe(expected);
      }
    },
  );

  it('prefixes its data attributes and CSS variables with ln-ext', () => {
    const [scenario] = legacyChart.scenarios;
    if (!scenario) throw new Error('no scenario');
    const { resize } = stubLayout();
    setPage({ ...scenario, init: JSON.stringify(scenario.json), host: true });
    distribution.start();
    resize();
    document
      .querySelector('#rating_distribution svg')
      ?.dispatchEvent(new PointerEvent('pointermove', { clientX: 300 }));
    const chart = document.querySelector('.ln-ext-dist');
    if (!chart) throw new Error('no chart');
    expect(unprefixedNames(chart)).toEqual([]);
    // The stylesheets and chart.ts read these names: check they're on the right elements.
    const bars = queryAll(chart, '.ln-ext-dist__bar', SVGElement);
    expect(bars.length).toBe(scenario.json.freq.length);
    for (const [i, bar] of bars.entries()) {
      expect(bar.dataset.lnExtBar).toBe(String(i));
      expect(bar.getAttribute('style')).toBe(`--ln-ext-bar-index:${i}`);
    }
    const markers = chart.querySelectorAll('.ln-ext-dist__mline, .ln-ext-dist__mark');
    expect(markers).toHaveLength(4);
    for (const marker of markers)
      expect(marker.getAttribute('style')).toMatch(/^--ln-ext-marker-color: ?#[0-9a-f]{6}\b/);
    const series = chart.querySelectorAll('.ln-ext-dist__chip, .ln-ext-rchart__tiprow');
    expect(series).toHaveLength(4);
    for (const element of series)
      expect(element.getAttribute('style')).toMatch(/^--ln-ext-series-color:#[0-9a-f]{6}$/);
  });

  it.each(legacy.rejected.map(page => [page.name, page]))(
    'leaves the page alone with %s',
    (_, { path, init, host }) => {
      stubLayout();
      setPage({ path, lang: 'en', init, host, wrapper: true });
      const before = document.body.innerHTML;
      distribution.start();
      expect(document.body.innerHTML).toBe(before);
    },
  );
});
