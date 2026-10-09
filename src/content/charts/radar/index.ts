import { createElement, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { setHtml } from '#shared/html.ts';
import { parseJson } from '#shared/json.ts';
import { readPageInitData } from '#shared/page-init-data.ts';
import { radarMarkup } from './render.ts';
import { DashboardInitSchema } from './schema.ts';

// The puzzle dashboard's theme radar (/training/dashboard). Lichess draws it
// with Chart.js into a canvas, out of reach of CSS; we draw it again in SVG
// from the same data. styles/dashboard/radar.css only hides Lichess's canvas
// once ours is in, so if the data ever changes shape the page keeps theirs.

function draw(text: string | null): void {
  const host = queryOne(document, '.puzzle-dashboard__global', HTMLElement);
  if (!host || host.querySelector('.lr-ext-radar')) return;
  const init = parseJson(text, DashboardInitSchema);
  if (!init) return;
  const figure = createElement('div', { className: 'lr-ext-radar' });
  setHtml(figure, radarMarkup(init.radar));
  host.append(figure);
}

export const radar: Feature = {
  name: 'puzzle radar',
  start: () => readPageInitData(draw),
};
