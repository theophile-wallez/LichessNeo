import { queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { pageLocale } from '#shared/lang.ts';
import { watchUntil } from '#shared/poll.ts';
import { captureAnswers } from './capture.ts';
import { type InsightsChart, mountChart } from './chart.ts';
import { categoryLabel, numberFormats } from './formats.ts';
import { chartModel, type ChartModel } from './model.ts';

// The insights page (/insights/<user>/<metric>/<dimension>). Lichess draws its
// answer with Chart.js into a canvas that no CSS of ours can reach, so we draw
// it in SVG from the same numbers, in the rating chart's look, with the
// player's own average over them. It runs in the page world, which sees the
// answers the page fetches.

const PAGE = /^\/insights(\/|$)/;
const CHART_BOX = '.insight__main .chart';
/** How long to wait for the page's own markup. */
const WAIT_MS = 20_000;

const chartBox = (): HTMLElement | null =>
  queryOne(document, `main#insight ${CHART_BOX}`, HTMLElement);

export const insights: Feature = {
  name: 'insights chart',
  start: () => {
    if (!PAGE.test(location.pathname)) return;
    const formats = numberFormats(pageLocale());
    const labelOf = categoryLabel(formats);
    let chart: InsightsChart | null = null;
    let answered: ChartModel | null = null;

    const draw = (host: HTMLElement): void => {
      if (!answered) return;
      // Each answer patches the box, which may have taken our chart with it.
      if (!chart || !host.contains(chart.root)) chart = mountChart(host, formats);
      chart?.show(answered);
    };

    const mountSoon = (): void => {
      const box = chartBox();
      if (box && !box.contains(chart?.root ?? null)) draw(box);
    };

    // Wrapped before the page asks its first question, which it does as soon
    // as its module loads.
    captureAnswers(answer => {
      answered = chartModel(answer, labelOf);
      const box = chartBox();
      if (box) draw(box);
    });

    // The box is drawn when the answer comes, and on a phone only once the
    // user picks the Insights view, which may be long after: so the page is
    // watched for as long as it lives. A pass with nothing to mount costs one
    // lookup inside this page's own main.
    watchUntil(
      () => queryOne(document, 'main#insight', HTMLElement),
      main => {
        new MutationObserver(mountSoon).observe(main, { childList: true, subtree: true });
        mountSoon();
      },
      WAIT_MS,
    );
  },
};
