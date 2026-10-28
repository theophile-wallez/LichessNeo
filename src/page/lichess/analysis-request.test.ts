import { afterEach, describe, expect, it } from 'vitest';
import { analysisRequested, analysisRequestForm, requestAnalysis } from './analysis-request.ts';

const page = (panel: string): string =>
  `<main class="analyse"><div class="analyse__underboard"><div class="analyse__underboard__panels"><div class="computer-analysis">${panel}</div><div class="fen-pgn"><form class="future-game-analysis"><button></button></form></div></div></div></main>`;

const FORM =
  '<form class="future-game-analysis" action="/request"><button type="submit"></button></form>';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Lichess’s analysis request', () => {
  it('is the form of the computer analysis panel, and is sent through its button', () => {
    document.body.innerHTML = page(FORM);
    const form = analysisRequestForm();
    expect(form?.parentElement?.classList.contains('computer-analysis')).toBe(true);
    let sent = 0;
    form?.addEventListener('submit', event => {
      event.preventDefault();
      sent++;
    });
    expect(requestAnalysis()).toBe(true);
    expect(sent).toBe(1);
    expect(analysisRequested()).toBe(false);
  });

  it('is gone once Lichess put its chart in the form’s place', () => {
    document.body.innerHTML = page('<div id="acpl-chart-container"></div>');
    expect(analysisRequestForm()).toBeNull();
    expect(requestAnalysis()).toBe(false);
    expect(analysisRequested()).toBe(true);
  });
});
