import { chipLabel } from '#shared/charts/markup.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import type { SampledSeries } from './sampling.ts';

/** A rating change as a chip shows it: `+12`, `−8` (a real minus sign), `±0`. */
export function signedChange(change: number): string {
  if (change > 0) return `+${change}`;
  if (change < 0) return `−${-change}`;
  return '±0';
}

function trend(change: number): 'up' | 'down' | 'flat' {
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'flat';
}

interface Legend {
  readonly rows: readonly SampledSeries[];
  readonly hidden: ReadonlySet<number>;
  /** A single rating can't be hidden: its chip is disabled. */
  readonly single: boolean;
}

/** One chip per rating: its value at the range's end and its change over the range. */
export function legendMarkup({ rows, hidden, single }: Legend): SafeHtml {
  const chips = rows.map(({ index, name, color, values }) => {
    const ratings = values.filter(value => value !== null);
    const now = ratings.at(-1) ?? 0;
    const change = now - (ratings[0] ?? 0);
    const off = hidden.has(index) ? ' ln-ext-rchart__chip--off' : '';
    return html`<button type="button" class="ln-ext-rchart__chip${off}" data-ln-ext-series="${index}" style="--ln-ext-series-color:${color}"${single ? html` disabled` : ''}>${chipLabel(name)}<strong>${now}</strong><span class="ln-ext-rchart__diff ln-ext-rchart__diff--${trend(change)}">${signedChange(change)}</span></button>`;
  });
  return html`${chips}`;
}
