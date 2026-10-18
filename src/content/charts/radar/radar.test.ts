import { afterEach, describe, expect, it } from 'vitest';
import { setHtml } from '#shared/html.ts';
import { restoreReadyState, setReadyState } from '#shared/testing/ready-state.ts';
import { bounds, plotPoints, vertex } from './geometry.ts';
import { radar } from './index.ts';
import { radarMarkup } from './render.ts';
import { DashboardInitSchema } from './schema.ts';
// What the original script (before the TypeScript port) drew for INIT.
import legacy from './fixtures/legacy.json' with { type: 'json' };

const INIT = {
  radar: {
    labels: ['Fork', 'Pin', 'Mate in 1', 'Endgame <x>', 'Opening'],
    datasets: [{ data: [1520, '1480', 1610.4, 1400, 1555] }],
  },
};

describe('DashboardInitSchema', () => {
  it('reads the labels and the values, numbers or numeric strings', () => {
    expect(DashboardInitSchema.parse(INIT).radar).toEqual({
      labels: INIT.radar.labels,
      values: [1520, 1480, 1610.4, 1400, 1555],
    });
  });

  it.each([
    ['fewer than three themes', { labels: ['a', 'b'], datasets: [{ data: [1, 2] }] }],
    ['a value per theme missing', { labels: ['a', 'b', 'c'], datasets: [{ data: [1, 2] }] }],
    [
      'a value that is not a number',
      { labels: ['a', 'b', 'c'], datasets: [{ data: [1, 2, 'x'] }] },
    ],
    ['no dataset', { labels: ['a', 'b', 'c'], datasets: [] }],
  ])('refuses %s', (_, radar) => {
    expect(DashboardInitSchema.safeParse({ radar }).success).toBe(false);
  });
});

describe('geometry', () => {
  it('starts at the top and goes clockwise', () => {
    const [x, y] = vertex(0, 4, 10);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(-10);
    expect(vertex(1, 4, 10)[0]).toBeCloseTo(10);
  });

  it('keeps every point inside the rim, even a flat set', () => {
    expect(bounds([5, 5, 5])).toEqual([-5, 15]);
    for (const [x, y] of plotPoints([100, 2000, 1500])) {
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(100.0001);
    }
  });
});

describe('radarMarkup', () => {
  it('draws what the original script drew, escaping the names', () => {
    const host = document.createElement('div');
    setHtml(host, radarMarkup(DashboardInitSchema.parse(INIT).radar));
    expect(host.innerHTML).toBe(legacy.markup);
    expect(host.innerHTML).toContain('Endgame &lt;x&gt;');
  });
});

// Starts the feature while the page parses, then hands it `text` as
// Lichess does: the data arrives, its module reads and removes it.
async function startOnParsingPage(text: string): Promise<HTMLElement> {
  document.body.innerHTML =
    '<main class="puzzle-dashboard"><div class="puzzle-dashboard__global"><canvas></canvas></div></main>';
  setReadyState('loading');
  radar.start();
  const script = document.createElement('script');
  script.id = 'page-init-data';
  script.textContent = text;
  document.body.append(script);
  await Promise.resolve();
  script.remove();
  restoreReadyState();
  document.dispatchEvent(new Event('DOMContentLoaded'));
  const host = document.querySelector('.puzzle-dashboard__global');
  if (!(host instanceof HTMLElement)) throw new Error('no dashboard');
  return host;
}

describe('the radar feature', () => {
  afterEach(() => {
    restoreReadyState();
    document.body.innerHTML = '';
  });

  it('draws the radar into the dashboard once the page is parsed', async () => {
    const host = await startOnParsingPage(JSON.stringify(INIT));
    const figure = host.lastElementChild;
    expect(host.children).toHaveLength(2);
    expect(figure?.className).toBe('ln-ext-radar');
    expect(figure?.innerHTML).toBe(legacy.markup);
  });

  it.each([
    ['too few themes', JSON.stringify({ radar: { labels: ['a'], datasets: [{ data: [1] }] } })],
    ['no radar', '{"puzzles":[]}'],
    ['broken JSON', '{"radar":'],
  ])('adds nothing for %s', async (_, text) => {
    const host = await startOnParsingPage(text);
    expect(host.innerHTML).toBe('<canvas></canvas>');
  });

  it('draws it once', () => {
    document.body.innerHTML = '<div class="puzzle-dashboard__global"></div>';
    const script = document.createElement('script');
    script.id = 'page-init-data';
    script.textContent = JSON.stringify(INIT);
    document.body.append(script);
    radar.start();
    radar.start();
    expect(document.querySelectorAll('.ln-ext-radar')).toHaveLength(1);
  });
});
