import { queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { parseJson } from '#shared/json.ts';
import { readPageInitData } from '#shared/page-init-data.ts';
import { mountDistribution } from './chart.ts';
import { DistributionSchema } from './schema.ts';

// The weekly rating distribution (/stat/rating/distribution/<perf>). Lichess
// draws it with Chart.js into a canvas that CSS can't restyle, so we draw it
// in SVG from the same data, in the look of the rating history chart. It runs
// in the page world, which has Lichess's translated labels. Lichess's canvas
// is only hidden once ours is in.

const PAGE = /\/stat\/rating\/distribution\//;

function boot(initData: string | null): void {
  const host = queryOne(document, '#rating_distribution', HTMLElement);
  if (!host) return;
  const data = parseJson(initData, DistributionSchema);
  if (!data || host.querySelector('.ln-ext-dist')) return;
  mountDistribution(host, data);
}

export const distribution: Feature = {
  name: 'rating distribution',
  start: () => {
    if (PAGE.test(location.pathname)) readPageInitData(boot);
  },
};
