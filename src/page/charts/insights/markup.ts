import { chipLabel, tipRow, tipTitle } from '#shared/charts/markup.ts';
import { html, type HtmlValue, type SafeHtml, trustedHtml } from '#shared/html.ts';
import { averageWord, type Formats } from './formats.ts';
import type { ChartModel, Row } from './model.ts';

// The chart's frame, its legend and its tooltip. The chips and the tooltip are
// the rating chart's (styles/ratingchart.css), so every chart of ours matches.

/** The size series' dot, which stands for no series of the metric. */
const SIZE_COLOR = 'var(--ln-ext-text-dim)';
/** The player's own average, which belongs to no series. */
const AVERAGE_COLOR = 'var(--ln-ext-text-strong)';

/** The frame, built once: an answer only fills its legend, labels and plot. */
export const SHELL = trustedHtml(
  '<div class="ln-ext-ins__legend"></div><div class="ln-ext-ins__plot"><div class="ln-ext-ins__labels"></div><svg class="ln-ext-ins__svg" aria-hidden="true"></svg><div class="ln-ext-rchart__tip ln-ext-ins__tip"></div></div>',
);

interface Chip {
  readonly color: string;
  readonly name: string;
  readonly value?: HtmlValue;
  /** The dashed swatch of the average's chip, which stands for its line. */
  readonly dashed?: boolean;
}

const chip = ({ color, name, value = '', dashed = false }: Chip): SafeHtml => {
  const strong = value === '' ? html`` : html`<strong>${value}</strong>`;
  const extra = dashed ? ' ln-ext-ins__chip--avg' : '';
  return html`<span class="ln-ext-rchart__chip ln-ext-ins__chip${extra}" style="--ln-ext-series-color:${color}">${chipLabel(name)}${strong}</span>`;
};

/**
 * The series and what the player does on average over them all. A lone series
 * is named by the metric's own picker, so only its average gets a chip, for
 * the line drawn across the plot.
 */
export function legendMarkup(model: ChartModel, formats: Formats): SafeHtml {
  const value = (average: number): string => formats.value(average, model.valueType);
  if (model.series.length === 1) {
    const [average] = model.averages;
    if (average === undefined) return html``;
    return chip({ color: AVERAGE_COLOR, name: averageWord(), value: value(average), dashed: true });
  }
  const chips = model.series.map((serie, index) => {
    const average = model.averages[index];
    return chip({
      color: serie.color,
      name: serie.name,
      ...(average === undefined ? {} : { value: value(average) }),
    });
  });
  return html`${chips}`;
}

/** A category: every series' value on it, and what it stands on. */
export function tipMarkup(row: Row, model: ChartModel, formats: Formats): SafeHtml {
  const values = model.series.map((serie, index) =>
    tipRow({
      color: serie.color,
      name: serie.name,
      value: formats.value(row.values[index] ?? 0, model.valueType),
    }),
  );
  const size = tipRow({ color: SIZE_COLOR, name: model.sizeName, value: formats.count(row.size) });
  return html`${tipTitle(row.label)}${values}${size}`;
}
