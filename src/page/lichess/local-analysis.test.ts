import { afterEach, describe, expect, it } from 'vitest';
import { localAnalysisButton, openLocalAnalysis } from './local-analysis.ts';

const page = (panel: string): string =>
  `<main class="analyse"><div class="analyse__underboard"><div class="analyse__underboard__panels"><div class="computer-analysis">${panel}</div></div></div></main>`;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Lichess’s analysis on the device', () => {
  it('opens from the editor’s button beside the request, hidden as it is', () => {
    document.body.innerHTML = page(
      '<form class="future-game-analysis"></form><button class="button analysis-editor" hidden></button>',
    );
    let clicks = 0;
    localAnalysisButton()?.addEventListener('click', () => clicks++);
    expect(openLocalAnalysis()).toBe(true);
    expect(clicks).toBe(1);
  });

  it('opens from the cog over the chart once the game has an analysis', () => {
    document.body.innerHTML = page(
      '<div id="acpl-chart-container"></div><i class="analysis-editor"></i>',
    );
    expect(localAnalysisButton()?.tagName).toBe('I');
  });

  it('is not offered where the panel has no editor, nor outside the analysis page', () => {
    document.body.innerHTML = `${page('<form class="future-game-analysis"></form>')}<div class="computer-analysis"><button class="analysis-editor"></button></div>`;
    expect(localAnalysisButton()).toBeNull();
    expect(openLocalAnalysis()).toBe(false);
  });
});
