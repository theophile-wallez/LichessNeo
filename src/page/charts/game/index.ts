import type { Feature } from '#shared/features.ts';
import { queryOne } from '#shared/dom.ts';
import { GAME_PAGE } from '#shared/game-path.ts';
import { analysis as pageAnalysis, type Analysis } from '#page/lichess/analysis.ts';
import { advantageSpec, moveTimesSpec } from './specs.ts';
import { PlyChart, type PlyChartSpec } from './plot.ts';

// A game's charts in its analysis' tools: the server analysis' advantage and
// the move times. Lichess draws them with Chart.js into canvases CSS can't
// restyle, so we draw them in SVG from the same data, in the look of our other
// charts. Lichess's canvas is hidden only once ours is in.

const CHECK_MS = 250;

interface ChartSlot {
  /** Lichess's container, which it adds once the chart's tab is first picked. */
  readonly container: string;
  readonly spec: (analysis: Analysis) => PlyChartSpec | null;
  /** What the chart is drawn from, cheap to read: a change redraws it. */
  readonly key: (analysis: Analysis) => string;
}

const SLOTS: readonly ChartSlot[] = [
  {
    container: '#acpl-chart-container',
    spec: advantageSpec,
    // The server analysis comes in as it runs.
    key: analysis => String(analysis.mainline.filter(node => node.eval !== undefined).length),
  },
  {
    container: '#movetimes-chart-container',
    spec: moveTimesSpec,
    key: analysis => String(analysis.course?.game.moveCentis?.length ?? 0),
  },
];

interface Mounted {
  readonly chart: PlyChart;
  readonly container: Element;
  key: string;
}

function sync(analysis: Analysis, slot: ChartSlot, mounted: Mounted | undefined): Mounted | null {
  const container = queryOne(document, slot.container, HTMLElement);
  if (!container) return null;
  const key = slot.key(analysis);
  if (mounted?.container === container && mounted.key === key) return mounted;
  const spec = slot.spec(analysis);
  if (!spec) return null;
  const chart =
    mounted?.container === container
      ? mounted.chart
      : new PlyChart(container, ply => analysis.jumpToMain(ply));
  chart.show(spec);
  return { chart, container, key };
}

function start(): void {
  if (!GAME_PAGE.test(location.pathname)) return;
  const mounted = new Map<ChartSlot, Mounted>();
  setInterval(() => {
    const analysis = pageAnalysis();
    if (!analysis || analysis.synthetic) return;
    const ply = analysis.onMainline ? analysis.node.ply : null;
    for (const slot of SLOTS) {
      const chart = sync(analysis, slot, mounted.get(slot));
      if (!chart) continue;
      mounted.set(slot, chart);
      chart.chart.follow(ply);
    }
  }, CHECK_MS);
}

export const gameCharts: Feature = { name: 'game charts', start };
