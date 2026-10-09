import { describe, expect, it, vi } from 'vitest';
import { mountChart } from './chart.ts';

// Our shell missing a part, as if its markup and parts.ts fell out of step.
vi.mock('./parts.ts', () => ({ findParts: () => null }));

describe('mountChart', () => {
  it('keeps Lichess’s chart when ours can’t be drawn', () => {
    const host = document.createElement('div');
    mountChart(host, [{ index: 0, name: 'Blitz', color: '#fff', points: [[0, 1500]] }]);
    expect(host.classList.contains('lr-ext-rchart-on')).toBe(false);
    expect(host.querySelector('.lr-ext-rchart')).toBeNull();
  });
});
