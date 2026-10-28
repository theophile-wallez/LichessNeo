import type { Feature } from '#shared/features.ts';
import { GAME_PAGE } from '#shared/game-path.ts';
import { analysis as pageAnalysis, type Analysis } from '#page/lichess/analysis.ts';
import { analysisRequested, analysisRequestForm } from '#page/lichess/analysis-request.ts';
import { Card } from './card.ts';
import { AnalysisDataSchema, serverAnalysis, type ServerAnalysis } from './state.ts';

// Lichess's server analysis, which our layout took from under the board, at
// the end of the move list: its request, its progress, then its chart and
// each side's errors. Out of the way on purpose: the Debrief is the analysis
// the extension offers, this one is there because Lichess has it.

const CHECK_MS = 250;

function readState(analysis: Analysis): ServerAnalysis {
  const { mainline } = analysis;
  return serverAnalysis({
    requestable: analysisRequestForm() !== null,
    started: analysisRequested(),
    full: analysis.hasServerAnalysis,
    positions: mainline.length,
    scored: mainline.filter(node => node.eval !== undefined).length,
    summary: analysis.dataOf(AnalysisDataSchema)?.analysis ?? null,
  });
}

function start(): void {
  if (!GAME_PAGE.test(location.pathname)) return;
  const card = new Card();
  setInterval(() => {
    const analysis = pageAnalysis();
    if (analysis && !analysis.synthetic && analysis.hasMainline)
      card.sync(analysis, readState(analysis));
  }, CHECK_MS);
}

export const serverAnalysisCard: Feature = { name: 'server analysis', start };
