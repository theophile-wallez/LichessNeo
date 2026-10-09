import { html, type SafeHtml } from '#shared/html.ts';
import { formatPoint, plotPoints, polygon, RADIUS, RINGS, vertex } from './geometry.ts';
import type { Radar } from './schema.ts';

function grid(themes: number): SafeHtml {
  const rings = Array.from(
    { length: RINGS },
    (_, k) => html`<polygon points="${polygon(themes, (RADIUS * (k + 1)) / RINGS)}"/>`,
  );
  const spokes = Array.from({ length: themes }, (_, i) => {
    const [x, y] = vertex(i, themes, RADIUS);
    return html`<line x1="0" y1="0" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}"/>`;
  });
  return html`<g class="lr-ext-radar__rings">${rings}</g><g class="lr-ext-radar__spokes">${spokes}</g>`;
}

// Labels are HTML rather than SVG text, for real fonts and wrapping. Each
// sits at its spoke's end (--lr-ext-x / --lr-ext-y), nudged outwards along it
// (--lr-ext-ox / --lr-ext-oy).
function label(name: string, value: number, i: number, themes: number): SafeHtml {
  const [unitX, unitY] = vertex(i, themes, 1);
  const style =
    `--lr-ext-x:${(50 + 50 * unitX).toFixed(2)}%;--lr-ext-y:${(50 + 50 * unitY).toFixed(2)}%;` +
    `--lr-ext-ox:${unitX.toFixed(3)};--lr-ext-oy:${unitY.toFixed(3)}`;
  return html`<div class="lr-ext-radar__label" style="${style}"><span class="lr-ext-radar__name">${name}</span><span class="lr-ext-radar__value">${Math.round(value)}</span></div>`;
}

export function radarMarkup({ labels, values }: Radar): SafeHtml {
  const themes = values.length;
  const points = plotPoints(values);
  const dots = points.map(
    ([x, y]) => html`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="2.6"/>`,
  );
  const viewBox = `${-RADIUS} ${-RADIUS} ${RADIUS * 2} ${RADIUS * 2}`;
  const area = points.map(formatPoint).join(' ');
  const chart = html`<svg class="lr-ext-radar__chart" viewBox="${viewBox}" aria-hidden="true">${grid(themes)}<polygon class="lr-ext-radar__area" points="${area}"/><g class="lr-ext-radar__dots">${dots}</g></svg>`;
  const labelsMarkup = labels.map((name, i) => label(name, values[i] ?? 0, i, themes));
  return html`<div class="lr-ext-radar__plot">${chart}${labelsMarkup}</div>`;
}
