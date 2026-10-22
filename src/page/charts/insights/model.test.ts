import { describe, expect, it } from 'vitest';
import { chartModel } from './model.ts';
import { barsLayout, curveLayout, CURVE_PADDING, ROW_HEIGHT } from './scales.ts';
import type { Answer } from './schema.ts';

// What the chart makes of an answer, and where it puts it: all pure.

const label = (category: string | number): string => String(category);

interface Built {
  readonly metric?: string;
  readonly xType?: string;
  readonly valueType?: string;
  readonly categories?: Answer['xAxis']['categories'];
  readonly series?: Answer['series'];
  readonly sizes?: readonly number[];
}

const answer = (built: Built = {}): Answer => ({
  question: { metric: built.metric ?? 'accuracy', dimension: 'piece' },
  xAxis: {
    name: 'Piece moved',
    categories: built.categories ?? ['Pawn', 'Knight'],
    dataType: built.xType ?? 'text',
  },
  valueYaxis: { name: 'Accuracy', dataType: built.valueType ?? 'percent' },
  sizeYaxis: { name: 'Number of moves', dataType: 'count' },
  series: built.series ?? [{ name: 'Accuracy', dataType: 'percent', data: [80, 60] }],
  sizeSerie: { name: 'Number of moves', dataType: 'count', data: [...(built.sizes ?? [3, 1])] },
});

const stacked: Answer['series'] = [
  { name: 'Victory', dataType: 'percent', stack: 'Game result', data: [100, 0] },
  { name: 'Draw', dataType: 'percent', stack: 'Game result', data: [0, 0] },
  { name: 'Defeat', dataType: 'percent', stack: 'Game result', data: [0, 100] },
];

describe('the chart model', () => {
  it('runs dates as a curve and every other dimension as rows', () => {
    expect(chartModel(answer(), label).mode).toBe('bars');
    const dated = answer({ xType: 'date', categories: [1727734044, 1731280400] });
    expect(chartModel(dated, label).mode).toBe('curve');
  });

  it('stacks the series that name a shared stack', () => {
    expect(chartModel(answer({ metric: 'result', series: stacked }), label).stacked).toBe(true);
    const apart: Answer['series'] = stacked.map(serie => ({
      name: serie.name,
      dataType: serie.dataType,
      data: serie.data,
    }));
    expect(chartModel(answer({ series: apart }), label).stacked).toBe(false);
  });

  it('writes a category’s label and what it stands on into its row', () => {
    const { rows } = chartModel(answer(), label);
    expect(rows).toEqual([
      { label: 'Pawn', values: [80], size: 3 },
      { label: 'Knight', values: [60], size: 1 },
    ]);
  });

  it('scales shares out of a hundred, whatever they reach', () => {
    const { scale } = chartModel(
      answer({ series: [{ name: 'A', dataType: 'percent', data: [3, 7] }] }),
      label,
    );
    expect(scale).toEqual({ min: 0, max: 100, step: 25 });
  });

  it('puts a zero in the middle when a value runs backwards', () => {
    const gains = answer({
      valueType: 'average',
      series: [{ name: 'Rating gain', dataType: 'average', data: [14, -1.17] }],
    });
    const { scale } = chartModel(gains, label);
    expect(scale.min).toBe(-scale.max);
    expect(scale.max).toBeGreaterThanOrEqual(14);
  });

  describe('the player’s own average', () => {
    it('weighs each category by the moves or games behind it', () => {
      // (80 × 3 + 60 × 1) / 4, not the plain (80 + 60) / 2.
      expect(chartModel(answer(), label).averages).toEqual([75]);
    });

    it('gives one per series of a stack', () => {
      const result = answer({ metric: 'result', series: stacked, sizes: [3, 1] });
      expect(chartModel(result, label).averages).toEqual([75, 0, 25]);
    });

    it('has none to show for a single category, which is its own average', () => {
      const alone = answer({
        categories: ['Pawn'],
        series: [{ name: 'Accuracy', dataType: 'percent', data: [80] }],
        sizes: [3],
      });
      expect(chartModel(alone, label).averages).toEqual([]);
    });

    it('has none when no games stand behind the categories', () => {
      expect(chartModel(answer({ sizes: [0, 0] }), label).averages).toEqual([]);
    });
  });

  describe('the series’ colors', () => {
    it('gives a game’s results green, grey and red, in Lichess’s order', () => {
      const { series } = chartModel(answer({ metric: 'result', series: stacked }), label);
      expect(series.map(serie => serie.color)).toEqual(['#21c43a', '#a3a1ad', '#df5353']);
    });

    it('writes a share in ink on a bright series and in white on a deep one', () => {
      const { series } = chartModel(answer({ metric: 'result', series: stacked }), label);
      expect(series.map(serie => serie.textColor)).toEqual([
        'var(--ln-ext-ink)',
        'var(--ln-ext-ink)',
        'var(--ln-ext-white)',
      ]);
    });

    it('leaves a lone series the page’s own color', () => {
      const [serie] = chartModel(answer(), label).series;
      expect(serie?.color).toBe('var(--ln-ext-ins-color, var(--ln-ext-accent))');
    });
  });
});

describe('the bars’ layout', () => {
  const scale = { min: 0, max: 100, step: 25 };

  it('spans the plot from the scale’s foot to its top, room left for the values', () => {
    const geometry = barsLayout(500, 3, scale);
    expect(geometry.x(0)).toBe(0);
    expect(geometry.x(100)).toBe(geometry.right);
    expect(geometry.right).toBeLessThan(500);
  });

  it('is as tall as its rows, plus the axis under them', () => {
    const geometry = barsLayout(500, 3, scale);
    expect(geometry.rowsBottom).toBe(3 * ROW_HEIGHT);
    expect(geometry.height).toBeGreaterThan(geometry.rowsBottom);
    expect(geometry.rowTop(2)).toBe(2 * ROW_HEIGHT);
  });

  it('stands a backwards bar’s foot in the middle', () => {
    const geometry = barsLayout(500, 2, { min: -20, max: 20, step: 10 });
    expect(geometry.zero).toBeCloseTo(geometry.right / 2);
  });
});

describe('the curve’s layout', () => {
  const scale = { min: 0, max: 80, step: 20 };

  it('puts the top of the scale at the top of the plot and its foot at the bottom', () => {
    const geometry = curveLayout(600, 300, 4, scale);
    expect(geometry.y(80)).toBe(geometry.top);
    expect(geometry.y(0)).toBe(geometry.bottom);
  });

  it('spreads the points from edge to edge, and centers a lone one', () => {
    const many = curveLayout(600, 300, 4, scale);
    expect(many.x(0)).toBe(CURVE_PADDING.left);
    expect(many.x(3)).toBe(CURVE_PADDING.left + many.plotWidth);
    const alone = curveLayout(600, 300, 1, scale);
    expect(alone.x(0)).toBe(CURVE_PADDING.left + alone.plotWidth / 2);
  });
});
