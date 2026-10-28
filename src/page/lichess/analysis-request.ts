import { queryOne } from '#shared/dom.ts';

// Lichess's request for a server analysis: a form in the underboard's
// computer analysis panel, which our layout hides. It's there only while the
// game has none and can have one (not for a game of 4 moves or fewer); its
// script posts it and swaps in the chart, and signed out asks to sign in.

const PANEL = 'main.analyse > .analyse__underboard .computer-analysis';

/** The request's form, while the game has no analysis and Lichess offers one. */
export const analysisRequestForm = (): HTMLFormElement | null =>
  queryOne(document, `${PANEL} form.future-game-analysis`, HTMLFormElement);

/** Lichess's script put its chart in the request's place: the analysis is coming or in. */
export const analysisRequested = (): boolean =>
  queryOne(document, `${PANEL} #acpl-chart-container`, HTMLElement) !== null;

/** Sends the request as Lichess's own button does; false when there is none to send. */
export function requestAnalysis(): boolean {
  const form = analysisRequestForm();
  const button = form && queryOne(form, 'button', HTMLButtonElement);
  button?.click();
  return Boolean(button);
}
