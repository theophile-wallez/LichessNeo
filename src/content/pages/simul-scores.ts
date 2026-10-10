import { createElement, queryAll, queryOne, setData, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// A host's simuls (/@/<user>/simuls/hosted, styles/simul/hosted.css): each card shows the
// host's wins, draws and losses as colored numbers and a bar. Lichess writes them as one
// text, "10 / 1 / 4"; the infinite scroll appends rows, hence every tick.

const ROWS = 'main.page-small.simul-list tbody tr:not([data-lr-ext-score])';

export interface SimulScore {
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
}

export function parseScore(text: string): SimulScore | null {
  const match = /^\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(text);
  if (!match) return null;
  return { wins: Number(match[1]), draws: Number(match[2]), losses: Number(match[3]) };
}

/** The column's head ("Wins/Draws/Losses", in the page's language) as one word per result. */
export function scoreWords(text: string): readonly string[] | null {
  const words = text.split('/').map(word => word.trim());
  return words.length === 3 && words.every(Boolean) ? words : null;
}

const share = (part: number, total: number): string =>
  `${total ? Math.round((1000 * part) / total) / 10 : 0}%`;

function markRow(row: HTMLTableRowElement, words: readonly string[] | null): void {
  const cell = row.cells[3];
  const score = cell ? parseScore(cell.textContent) : null;
  setData(row, 'lrExtScore', score ? 'yes' : 'no');
  if (!cell || !score) return;
  const total = score.wins + score.draws + score.losses;
  setStyleProperty(row, '--lr-ext-wins', share(score.wins, total));
  setStyleProperty(row, '--lr-ext-draws', share(score.draws, total));
  const numbers = createElement('span', { className: 'lr-ext-simul-score' });
  for (const [i, value] of [score.wins, score.draws, score.losses].entries()) {
    const word = words?.[i];
    numbers.append(
      createElement('b', {
        text: String(value),
        attrs: word ? { title: word, 'data-lr-ext-label': Array.from(word)[0] ?? '' } : {},
      }),
    );
  }
  cell.append(numbers);
}

export function syncScores(): void {
  const rows = queryAll(document, ROWS, HTMLTableRowElement);
  if (!rows.length) return;
  const head = queryOne(document, 'main.page-small.simul-list thead th:last-child', HTMLElement);
  const words = head ? scoreWords(head.textContent) : null;
  for (const row of rows) markRow(row, words);
}

export const simulScores: Feature = {
  name: 'simul scores',
  start: () => onEveryTick('simul scores', syncScores),
};
