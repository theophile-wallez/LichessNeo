import { queryOne } from '#shared/dom.ts';

// Lichess's analysis on the device: its editor, a dialog where the engine,
// threads, hash and quality are picked, then the whole game scored in the
// browser. It opens from the underboard's computer analysis panel, which our
// layout hides: a button beside the server analysis' request, or a cog over
// the chart once the game has an analysis.

const EDITOR = 'main.analyse > .analyse__underboard .computer-analysis .analysis-editor';

/** The editor's button, or its cog over the chart: Lichess offers its analysis on the device. */
export const localAnalysisButton = (): HTMLElement | null =>
  queryOne(document, EDITOR, HTMLElement);

/** Opens the editor as Lichess's own button does; false when there is none. */
export function openLocalAnalysis(): boolean {
  const button = localAnalysisButton();
  // Lichess listens on the panels, so a click on the hidden button opens it.
  button?.click();
  return Boolean(button);
}
