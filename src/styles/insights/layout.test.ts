import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's own rules (ui/insight/css): a header and a chart of fixed heights.
// Ours must beat both, or the pickers overflow the title they wrap under and
// the rows are cut at 550px.
const LICHESS_RULES =
  '#insight { ---header-height: 60px; ---chart-height: 550px }' +
  '#insight header { height: var(---header-height) }' +
  '#insight .chart { height: var(---chart-height) }';

const PAGE =
  '<main id="insight"><div class="ready"><div></div><span></span><div>' +
  '<header><h2 class="text">Chess Insights</h2><div class="axis-form"></div></header>' +
  '<div class="insight__main box"><div class="chart"><canvas></canvas></div></div>' +
  '</div></div></main>';

function styleThePage(): void {
  const style = document.createElement('style');
  const ours = ['layout.css', 'chart.css']
    .map(name => readFileSync(join(import.meta.dirname, name), 'utf8'))
    .join('');
  style.textContent = LICHESS_RULES + ours;
  document.head.append(style);
  document.body.innerHTML = PAGE;
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('the insights layout', () => {
  it('lets the header grow, so its pickers fit under the title', () => {
    styleThePage();
    const header = queryOne(document, 'main#insight header', HTMLElement);
    if (!header) throw new Error('no header');
    expect(getComputedStyle(header).height).toBe('auto');
  });

  it('frees the chart box of its fixed height, but only once our chart is in', () => {
    styleThePage();
    const box = queryOne(document, 'main#insight .chart', HTMLElement);
    if (!box) throw new Error('no chart box');
    expect(getComputedStyle(box).height).toBe('550px');
    box.classList.add('ln-ext-ins-on');
    expect(getComputedStyle(box).height).toBe('auto');
  });
});
