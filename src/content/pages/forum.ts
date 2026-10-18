import { queryAll, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The forum index (styles/forum/categories.css): the categories become cards
// and their table header goes, so each count gets its column's name ("Topics",
// "Posts", translated) to show as a label. The index is server-rendered, so
// editing it is safe.

function labelCounts(table: HTMLTableElement): void {
  setData(table, 'lnExtLabels', '');
  const names = [...(table.tHead?.rows[0]?.cells ?? [])].map(cell => cell.textContent.trim());
  for (const row of table.tBodies[0]?.rows ?? []) {
    for (const cell of row.cells) {
      const name = names[cell.cellIndex];
      if (name) setData(cell, 'lnExtLabel', name);
    }
  }
}

export function syncForumLabels(): void {
  const tables = 'main.forum table.categs:not([data-ln-ext-labels])';
  for (const table of queryAll(document, tables, HTMLTableElement)) labelCounts(table);
}

export const forumLabels: Feature = {
  name: 'forum labels',
  start: () => onEveryTick('forum labels', syncForumLabels),
};
