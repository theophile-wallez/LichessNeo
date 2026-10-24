import { queryAll, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// A player who won the same award many times (forty marathons) had a tile for each, rows
// of them. Identical awards fold into the first one's tile, which shows how many there are
// (styles/profile/hero.css); the others are hidden, not removed.

const TROPHIES = '.user-show > .user-show__header .trophies';
const TILE = ':is(.trophy, .shield-trophy, .combo-trophy)';

/** What tells one award from another: its kind's classes, glyph and picture, not its link. */
const awardKey = (tile: HTMLElement): string =>
  [tile.className, tile.textContent.trim(), queryOne(tile, 'img', HTMLImageElement)?.src].join('|');

/** The tile, or the link Lichess wraps it in. */
const itemOf = (tile: HTMLElement): HTMLElement =>
  tile.parentElement instanceof HTMLAnchorElement ? tile.parentElement : tile;

export function groupTrophies(trophies: HTMLElement): void {
  const firsts = new Map<string, { tile: HTMLElement; count: number }>();
  for (const tile of queryAll(trophies, TILE, HTMLElement)) {
    const key = awardKey(tile);
    const first = firsts.get(key);
    if (first) {
      first.count += 1;
      setData(itemOf(tile), 'lnExtTrophyRepeat', '');
    } else {
      firsts.set(key, { tile, count: 1 });
    }
  }
  for (const { tile, count } of firsts.values()) {
    setData(tile, 'lnExtTrophyCount', count > 1 ? String(count) : null);
  }
}

export function syncTrophies(): void {
  const trophies = queryOne(
    document,
    `${TROPHIES}:not([data-ln-ext-trophies-grouped])`,
    HTMLElement,
  );
  if (!trophies) return;
  groupTrophies(trophies);
  setData(trophies, 'lnExtTrophiesGrouped', '');
}

export const profileTrophies: Feature = {
  name: 'profile trophies',
  start: () => onEveryTick('profile trophies', syncTrophies),
};
