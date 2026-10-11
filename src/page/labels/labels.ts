import { isParsing, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { pollUntil } from '#shared/poll.ts';
import { nonEmpty } from '#shared/text.ts';
import { translate } from '#page/lichess/globals.ts';

// Lichess's own labels for what the content script adds: the game page's flip
// button (src/content/game/board-tools.ts), the analysis controls' tools
// (src/content/analysis/underboard.ts) and the tournament podium's scores
// (src/content/pages/podium.ts). Only the page world can read Lichess's
// translations, so this copies them onto <html>.

/** Each label's `i18n.site` key, by the data attribute it goes into. */
const LABELS = {
  lrExtFlipLabel: 'flipBoard',
  lrExtToolsLabel: 'tools',
  lrExtPointsLabel: 'points',
};

// All come in the same table: once one is in, they all are.
const readLabels = (): Map<string, string> | null => {
  const labels = new Map<string, string>();
  for (const [data, key] of Object.entries(LABELS)) {
    const label = nonEmpty(translate(key, ''));
    if (label) labels.set(data, label);
  }
  return labels.size > 0 ? labels : null;
};

// The translations may still be on their way to a game, analysis or tournament page.
const mayCome = (): boolean =>
  isParsing() || document.querySelector('main:is(.round, .analyse, .tour, .swiss)') !== null;

export const labels: Feature = {
  name: 'labels',
  start: () =>
    pollUntil(
      readLabels,
      found => {
        for (const [data, label] of found) setData(document.documentElement, data, label);
      },
      { intervalMs: 250, giveUpMs: 30_000, worthWaiting: mayCome },
    ),
};
