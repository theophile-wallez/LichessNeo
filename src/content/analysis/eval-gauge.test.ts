import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { gaugeScore, syncEvalGauge } from './eval-gauge.ts';
// The eval bar's label and side per engine score, as the original wrote them.
import legacy from './fixtures/legacy-eval-gauge.json' with { type: 'json' };

afterEach(() => {
  document.body.innerHTML = '';
});

describe('eval gauge', () => {
  it.each(legacy.scores)('reads $score as the original did', ({ score, eval: label, lead }) => {
    document.body.innerHTML = `<main class="puzzle"><div class="eval-gauge"></div><div class="ceval"><pearl>${score}</pearl></div></main>`;
    syncEvalGauge();
    const gauge = queryOne(document, '.eval-gauge', HTMLElement);
    expect(gauge?.dataset.lnExtEval ?? null).toBe(label);
    expect(gauge?.dataset.lnExtLead).toBe(lead);
  });

  it('clears a label once the engine line is gone', () => {
    document.body.innerHTML =
      '<main class="analyse"><div class="eval-gauge" data-ln-ext-eval="3.1" data-ln-ext-lead="black"></div></main>';
    syncEvalGauge();
    expect(document.querySelector('.eval-gauge')?.outerHTML).toBe(legacy.cleared);
  });

  it('reads a mate and its side', () => {
    expect(gaugeScore('#−3')).toEqual({ label: 'M3', lead: 'black' });
  });
});
