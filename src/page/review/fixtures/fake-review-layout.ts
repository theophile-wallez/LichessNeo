import { vi } from 'vitest';

// Test support: sizes for what the review measures, as a desktop layout would
// give them (happy-dom lays nothing out). A comment of more than 22 words
// overflows its bubble, so its droppable sentence is dropped.

type Metric = 'clientWidth' | 'clientHeight' | 'scrollHeight' | 'offsetWidth' | 'offsetHeight';

const METRICS: readonly Metric[] = [
  'clientWidth',
  'clientHeight',
  'scrollHeight',
  'offsetWidth',
  'offsetHeight',
];

const SIZES: readonly (readonly [string, Partial<Record<Metric, number>>])[] = [
  ['.ln-ext-review__graph, #ln-ext-review-graph', { clientWidth: 316, clientHeight: 96 }],
  ['.ln-ext-bubble__sub', { clientHeight: 36 }],
  ['#ln-ext-tip', { offsetWidth: 120, offsetHeight: 30 }],
  ['.ln-ext-graph-tip', { offsetWidth: 40 }],
  ['.analyse__moves', { clientHeight: 300 }],
  ['move', { offsetHeight: 20 }],
];

function measure(element: HTMLElement, metric: Metric): number {
  if (metric === 'scrollHeight' && element.matches('.ln-ext-bubble__sub'))
    return element.querySelectorAll('.ln-ext-w').length * 2;
  const size = SIZES.find(([selector]) => element.matches(selector))?.[1];
  return size?.[metric] ?? 0;
}

export function fakeReviewLayout(): void {
  for (const metric of METRICS)
    vi.spyOn(HTMLElement.prototype, metric, 'get').mockImplementation(function (this: HTMLElement) {
      return measure(this, metric);
    });
}
