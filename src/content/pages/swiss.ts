import { queryAll, queryOne, setData, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// Swiss tournaments (styles/swiss/, styles/swiss-show/). Their pages are
// server-rendered, so styling Lichess's elements is safe.

const MEDALS: ReadonlySet<string> = new Set(['1', '2', '3']);

/** The progress bar's width for a round count ("5/10 rounds", digits in every language). */
export function roundsProgress(text: string): string | null {
  const match = /(\d+)\s*\/\s*(\d+)/.exec(text);
  if (!match) return null;
  const played = Number(match[1]);
  const total = Number(match[2]);
  return total ? `${Math.min(100, (100 * played) / total)}%` : null;
}

// On the home page's cards and in a tournament's info panel, where the bar spans
// the paragraph around the count. A tournament's page rewrites its count in
// place when a round starts, so we keep the last count read rather than a flag.
export function syncRounds(): void {
  const counts = '.swiss-home .swisses .rounds, main.swiss .swiss__meta__round';
  for (const rounds of queryAll(document, counts, HTMLElement)) {
    const text = rounds.textContent;
    if (rounds.dataset.lnExtRounds === text) continue;
    setData(rounds, 'lnExtRounds', text);
    const progress = roundsProgress(text);
    const bar = rounds.matches('.swiss__meta__round') ? rounds.parentElement : rounds;
    if (progress !== null && bar) setStyleProperty(bar, '--ln-ext-progress', progress);
  }
}

// The leaders' ranks in medal colors. CSS can't tell which page of the
// standings is shown (the pager's buttons disappear while searching), so we
// read the rank's own text. Rows are re-ranked live, hence every tick.
export function syncMedals(): void {
  for (const rank of queryAll(document, 'main.swiss .swiss__standing td.rank', HTMLElement)) {
    const text = rank.textContent.trim();
    setData(rank, 'lnExtMedal', MEDALS.has(text) ? text : null);
  }
}

// From 1260px the page doesn't scroll, only its middle column does. Page keys
// act on the focused scroller, so the column takes the focus once, unless
// something else has it.
export function syncFocus(): void {
  const column = queryOne(document, 'main.swiss .swiss__main:not([tabindex])', HTMLElement);
  if (!column || !matchMedia('(min-width: 1260px)').matches) return;
  column.tabIndex = -1;
  if (document.activeElement === document.body) column.focus({ preventScroll: true });
}

export const swiss: Feature = {
  name: 'swiss',
  start: () => {
    onEveryTick('swiss rounds', syncRounds);
    onEveryTick('swiss medals', syncMedals);
    onEveryTick('swiss focus', syncFocus);
  },
};
