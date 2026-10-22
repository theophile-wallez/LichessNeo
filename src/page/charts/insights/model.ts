import { seriesColor } from '#shared/charts/colors.ts';
import { niceScale } from '#shared/charts/steps.ts';
import type { Answer } from './schema.ts';

// What the chart draws, read off one answer. Pure: the category labels come
// formatted (formats.ts), since only a locale knows how to write a date.

/** Dates run as a curve over time; every other dimension is a row per category. */
export type ChartMode = 'bars' | 'curve';

export const PERCENT = 'percent';
const DATE = 'date';

/** A single series takes the page's own color (styles/insights/layout.css). */
const PAGE_COLOR = 'var(--ln-ext-ins-color, var(--ln-ext-accent))';

// Lichess answers a game's result as victory, draw then defeat. Their names
// are translated, so the order is all that tells them apart.
const RESULT_COLORS: readonly string[] = ['#21c43a', '#a3a1ad', '#df5353'];

export interface Row {
  readonly label: string;
  /** One value per series. */
  readonly values: readonly number[];
  /** The games or moves the row stands on. */
  readonly size: number;
}

export interface SerieView {
  readonly name: string;
  readonly color: string;
  /** What reads on that color, for a share written inside its segment. */
  readonly textColor: string;
}

export interface ValueScale {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

export interface ChartModel {
  readonly mode: ChartMode;
  /** The series share a bar, each a segment of it (a game's results). */
  readonly stacked: boolean;
  readonly rows: readonly Row[];
  readonly series: readonly SerieView[];
  readonly scale: ValueScale;
  /**
   * The player's own average per series over these games, which Lichess's own
   * chart doesn't say: a bar past it did better than they usually do. Empty
   * when there's nothing to compare (one category, or no games behind them).
   */
  readonly averages: readonly number[];
  readonly valueType: string;
  readonly valueName: string;
  readonly sizeName: string;
}

function serieColors(answer: Answer): readonly string[] {
  if (answer.series.length === 1) return [PAGE_COLOR];
  if (answer.question.metric === 'result' && answer.series.length === RESULT_COLORS.length)
    return RESULT_COLORS;
  // The shared palette, so a chart of ours never shows a color another doesn't.
  return answer.series.map((_, index) => seriesColor(index));
}

const INK = 'var(--ln-ext-ink)';
const WHITE = 'var(--ln-ext-white)';
/** Over this, a color is bright enough to need dark text on it. */
const BRIGHT = 0.3;

const channel = (value: number): number =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

/** Ink on a bright series, white on a deep one (AGENTS.md, "Dark on the bright hues"). */
function textOn(color: string): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color)?.[1];
  // A color named by a variable is the page's own, which carries white text.
  if (!hex) return WHITE;
  const [red = 0, green = 0, blue = 0] = [0, 2, 4].map(at =>
    channel(Number.parseInt(hex.slice(at, at + 2), 16) / 255),
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > BRIGHT ? INK : WHITE;
}

function valueScale(rows: readonly Row[], valueType: string): ValueScale {
  // Every share is out of a hundred, whatever the numbers reach.
  if (valueType === PERCENT) return { min: 0, max: 100, step: 25 };
  const values = rows.flatMap(row => row.values);
  const { step, max } = niceScale(Math.max(...values.map(Math.abs), Number.MIN_VALUE));
  // Rating gains run both ways, and read best around a zero in the middle.
  return { min: values.some(value => value < 0) ? -max : 0, max, step };
}

/**
 * Each series' average over every category, weighted by what the categories
 * stand on: a category's moves or games. So the accuracy of a player who moved
 * their rook twice doesn't count as much as the one they played a hundred
 * pawn moves with.
 */
function averagesOf(rows: readonly Row[], series: number): number[] {
  const weight = rows.reduce((total, row) => total + row.size, 0);
  // One category is its own average, and nothing to weigh with is no average.
  if (rows.length < 2 || weight <= 0) return [];
  return Array.from(
    { length: series },
    (_, serie) =>
      rows.reduce((total, row) => total + (row.values[serie] ?? 0) * row.size, 0) / weight,
  );
}

export function chartModel(
  answer: Answer,
  labelOf: (category: string | number) => string,
): ChartModel {
  const colors = serieColors(answer);
  const rows = answer.xAxis.categories.map((category, index) => ({
    label: labelOf(category),
    values: answer.series.map(serie => serie.data[index] ?? 0),
    size: answer.sizeSerie.data[index] ?? 0,
  }));
  return {
    mode: answer.xAxis.dataType === DATE ? 'curve' : 'bars',
    stacked: answer.series.length > 1 && answer.series.every(serie => serie.stack !== undefined),
    rows,
    series: answer.series.map((serie, index) => {
      const color = colors[index] ?? PAGE_COLOR;
      return { name: serie.name, color, textColor: textOn(color) };
    }),
    scale: valueScale(rows, answer.valueYaxis.dataType),
    averages: averagesOf(rows, answer.series.length),
    valueType: answer.valueYaxis.dataType,
    valueName: answer.valueYaxis.name,
    sizeName: answer.sizeYaxis.name,
  };
}
