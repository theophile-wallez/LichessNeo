import { html, type HtmlValue, type SafeHtml, trustedHtml } from '#shared/html.ts';

// Markup shared by the rating history and the distribution, so that their
// chips, axes and tooltips look alike (styles/ratingchart.css styles both).

const SWATCH = trustedHtml('<span class="ln-ext-rchart__swatch"></span>');

/** A chip's color dot and name. */
export const chipLabel = (name: string): SafeHtml =>
  html`${SWATCH}<span class="ln-ext-rchart__name">${name}</span>`;

export const tipTitle = (title: HtmlValue): SafeHtml =>
  html`<div class="ln-ext-rchart__tipdate">${title}</div>`;

interface TipRow {
  readonly color: string;
  readonly name: string;
  readonly value: HtmlValue;
}

export const tipRow = ({ color, name, value }: TipRow): SafeHtml =>
  html`<div class="ln-ext-rchart__tiprow" style="--ln-ext-series-color:${color}">${SWATCH}<span>${name}</span><strong>${value}</strong></div>`;

interface AxisLabel {
  readonly x: number;
  readonly y: number;
  readonly text: HtmlValue;
}

export const xAxisLabel = ({ x, y, text }: AxisLabel): SafeHtml =>
  html`<text class="ln-ext-rchart__xlabel" x="${x}" y="${y}">${text}</text>`;

interface GridLine {
  readonly y: number;
  readonly left: number;
  readonly right: number;
  readonly label: HtmlValue;
  /** Another class for the line, as a leading-space suffix (` ln-ext-dist__base`). */
  readonly extraClass?: string;
}

/** A horizontal grid line, its value on the left. */
export const gridLine = ({ y, left, right, label, extraClass = '' }: GridLine): SafeHtml =>
  html`<line class="ln-ext-rchart__grid${extraClass}" x1="${left}" x2="${right}" y1="${y}" y2="${y}"/><text class="ln-ext-rchart__ylabel" x="${left - 10}" y="${y}">${label}</text>`;

interface Area {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The transparent rectangle that catches the pointer over the plot. */
export const hitArea = ({ x, y, width, height }: Area): SafeHtml =>
  html`<rect class="ln-ext-rchart__hit" x="${x}" y="${y}" width="${width}" height="${height}"/>`;
