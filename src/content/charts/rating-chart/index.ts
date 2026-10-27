import { queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { parseJson } from '#shared/json.ts';
import { readPageInitData } from '#shared/page-init-data.ts';
import { chesscomShown } from '#shared/chesscom-rating/shown.ts';
import { currentSettings, onSettings, settingsRead } from '#content/settings/settings.ts';
import { mountChart } from './chart.ts';
import { inChesscomRatings } from './chesscom.ts';
import { readInlineInit } from './inline-init.ts';
import { RatingHistorySchema } from './schema.ts';
import { readSeries, type Series, toSeries } from './series.ts';

// The rating history chart, on a profile and on a rating's stats page.
// Lichess draws it with Chart.js into a canvas that CSS can't restyle; we
// draw it again in SVG from the same data. Lichess's chart is only hidden
// once ours is in, so if the data ever changes shape the page keeps theirs.

// The outer container is the card; Lichess's chart is the inner one.
const HOST = '.rating-history-container:has(> .rating-history-container)';

function pageSeries(initData: string | null): Series[] | null {
  const history = parseJson(initData, RatingHistorySchema);
  const series = history ? toSeries(history) : null;
  if (series && series.length > 0) return series;
  const inline = readInlineInit(document);
  return inline ? readSeries(inline) : null;
}

function boot(initData: string | null): void {
  const host = queryOne(document, HOST, HTMLElement);
  if (!host) return;
  const series = pageSeries(initData);
  // Nothing to draw (a rating never played): Lichess hides its chart but leaves
  // its box, an empty gap, so we hide the box.
  if (series?.length === 0) host.classList.toggle('ln-ext-rchart-none', true);
  if (!series || series.length === 0 || host.querySelector('.ln-ext-rchart')) return;
  // The switch as last kept, until the settings are read.
  let chesscom = settingsRead() ? currentSettings().chesscomRating : chesscomShown();
  const shown = (): Series[] => (chesscom ? inChesscomRatings(series) : [...series]);
  const chart = mountChart(host, shown());
  // The settings' Chess.com ratings, switched in any tab.
  onSettings(settings => {
    if (settings.chesscomRating === chesscom) return;
    chesscom = settings.chesscomRating;
    chart?.showSeries(shown());
  });
}

export const ratingChart: Feature = {
  name: 'rating chart',
  start: () => readPageInitData(boot),
};
