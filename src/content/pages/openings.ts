import { queryAll, queryOne, setData, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The openings' cards (styles/pages/openings). Lichess stacks a result bar's parts
// as inline heights, which our bar lays across: each share goes into a variable.
// A move that keeps its opening's name has none on Lichess: its card gets the
// opening's own, the last part of the page's title.

/** A result bar part's share, from its inline height ("47.11%"); null for any other. */
export function shareOf(height: string): string | null {
  return /^\d+(\.\d+)?%$/.test(height.trim()) ? height.trim().slice(0, -1) : null;
}

export function syncOpenings(): void {
  const main = queryOne(document, 'main.opening', HTMLElement);
  if (!main) return;
  for (const part of queryAll(main, '.result-bar > span', HTMLElement)) {
    setStyleProperty(part, '--ln-ext-share', shareOf(part.style.height));
  }
  const sections = queryAll(main, 'h1.opening__title .opening__name__section', HTMLElement);
  const opening = sections.at(-1)?.textContent.trim() ?? '';
  for (const name of queryAll(main, '.opening__next__name', HTMLElement)) {
    const unnamed = name.textContent.trim() === '' && opening !== '';
    setData(name, 'lnExtName', unnamed ? opening : null);
  }
}

export const openings: Feature = {
  name: 'openings',
  start: () => onEveryTick('openings', syncOpenings),
};
