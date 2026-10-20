import { html, type SafeHtml } from '#shared/html.ts';
import { arrowOutline, arrowPath } from './geometry.ts';
import type { Arrow, SquareFill } from './svg-shapes.ts';

/** The marked squares, for the layer under the pieces. */
export const fillsMarkup = (fills: readonly SquareFill[]): SafeHtml =>
  html`${fills.map(
    ({ at: [x, y], color, opacity }) =>
      html`<rect x="${x - 0.5}" y="${y - 0.5}" width="1" height="1" fill="rgba(${color},${opacity})"/>`,
  )}`;

/** The arrows' shapes, for either layer. */
export const arrowPolygons = (arrows: readonly Arrow[]): SafeHtml =>
  html`${arrows.map(
    ({ from, to, color, opacity }) =>
      html`<polygon points="${arrowOutline(arrowPath(from, to))}" fill="rgba(${color},${opacity})"/>`,
  )}`;

export function arrowsMarkup(arrows: readonly Arrow[]): SafeHtml {
  if (arrows.length === 0) return html``;
  return html`<svg class="ln-ext-shapes__arrows" viewBox="0 0 8 8">${arrowPolygons(arrows)}</svg>`;
}
