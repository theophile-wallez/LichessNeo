import type { Square } from '#shared/chess/types.ts';
import { html, trustedHtml, type SafeHtml } from '#shared/html.ts';
import { arrowOutline, arrowPath, squareOnScreen } from './geometry.ts';
import type { MatePhase } from './mate.ts';
import type { Arrow, SquareFill } from './svg-shapes.ts';

// A king beside a "#", black on the red badge.
const MATE_ICON = trustedHtml(
  '<svg viewBox="0 0 24 24"><g fill="#000">' +
    '<path d="M3 8.5h1.5v9H3zM5.8 8.5h1.5v9H5.8zM1.5 10.6h7.3v1.5H1.5zM1.5 13.9h7.3v1.5H1.5z"/>' +
    '<path d="M15.1 2h1.8v5h-1.8zM13.5 3.3h5v1.7h-5z"/>' +
    '<path d="M9.6 12.6c0-2.5 2.6-3.6 4.6-2.3.8.5 1.4 1.3 1.8 2.1.4-.8 1-1.6 1.8-2.1 2-1.3 4.6-.2 4.6 2.3 0 2.6-2.2 4.8-2.9 5.5h-7c-.7-.7-2.9-2.9-2.9-5.5z"/>' +
    '<rect x="12.1" y="18.8" width="7.8" height="2.4" rx="0.8"/></g></svg>',
);

/** The marked squares, for the layer under the pieces. */
export const fillsMarkup = (fills: readonly SquareFill[]): SafeHtml =>
  html`${fills.map(
    ({ at: [x, y], color, opacity }) =>
      html`<rect x="${x - 0.5}" y="${y - 0.5}" width="1" height="1" fill="rgba(${color},${opacity})"/>`,
  )}`;

export function arrowsMarkup(arrows: readonly Arrow[]): SafeHtml {
  if (arrows.length === 0) return html``;
  const polygons = arrows.map(
    ({ from, to, color, opacity }) =>
      html`<polygon points="${arrowOutline(arrowPath(from, to))}" fill="rgba(${color},${opacity})"/>`,
  );
  return html`<svg class="ln-ext-shapes__arrows" viewBox="0 0 8 8">${polygons}</svg>`;
}

export interface Mate {
  readonly king: Square;
  readonly phase: Exclude<MatePhase, 'none'>;
  readonly whiteAtBottom: boolean;
  readonly label: string;
}

// Positions are in percent of the board, from its top left corner.
export function mateMarkup({ king, phase, whiteAtBottom, label }: Mate): SafeHtml {
  const [column, row] = squareOnScreen(king, whiteAtBottom);
  const x = column * 12.5;
  const y = row * 12.5;
  if (phase === 'badge') {
    return html`<div class="ln-ext-mate__badge" style="left:${x + 12.5}%;top:${y}%">${MATE_ICON}</div>`;
  }
  return html`<div class="ln-ext-mate__square" style="left:${x}%;top:${y}%"><div class="ln-ext-mate__icon">${MATE_ICON}</div></div><div class="ln-ext-mate__label" style="left:${x + 6.25}%;top:${y + 1.1}%">${label}</div>`;
}
