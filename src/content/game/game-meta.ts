import type { Color } from '#shared/chess/types.ts';
import { createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { computerRatings } from './ai-players.ts';

// The game's info where there's no chat (styles/game/game-info.css). Lichess
// writes its lines as runs of text ("3+0 • Rated • Blitz"), so each part gets a
// span of its own, shown as a pill or its own line. The players' names get one
// too, so they can be truncated alone, and the ratings lose their brackets to
// show as chips. The info is server-rendered, so editing it is safe; each piece
// is marked once done, as Lichess may add new ones.

/** The parts of a line of the game info. */
export const infoParts = (text: string): string[] =>
  text
    .split('•')
    .map(part => part.trim())
    .filter(part => part !== '');

function splitParts(line: HTMLElement): void {
  setData(line, 'lrExtParts', '');
  // A copy: replacing a node changes the live list.
  for (const node of Array.from(line.childNodes)) {
    if (!(node instanceof Text)) continue;
    const parts = infoParts(node.data).map(text =>
      createElement('span', { className: 'lr-ext-part', text }),
    );
    node.replaceWith(...parts);
  }
}

function wrapName(link: HTMLElement): void {
  setData(link, 'lrExtName', '');
  for (const node of Array.from(link.childNodes)) {
    const name = node instanceof Text ? node.data.trim() : '';
    if (name !== '')
      node.replaceWith(createElement('span', { className: 'lr-ext-meta-name', text: name }));
  }
  const rating = queryOne(link, '.rating', HTMLElement);
  if (!rating) return;
  const bare = rating.textContent.replace(/[()\s]/g, '');
  if (rating.textContent !== bare) rating.textContent = bare;
}

// The computer has no rating, so we show its level's estimated rating instead
// (see ai-players.ts).
function addComputerRatings(meta: HTMLElement, ratings: ReadonlyMap<Color, string>): void {
  for (const [color, rating] of ratings) {
    const selector = `.game__meta__players .player.${color} > span.user-link`;
    const link = queryOne(meta, selector, HTMLElement);
    if (!link || link.querySelector('.rating')) continue;
    link.append(createElement('span', { className: 'rating', text: rating }));
  }
}

export function syncGameMeta(ratings: ReadonlyMap<Color, string>): void {
  const meta = queryOne(document, 'main.round .round__side > .game__meta', HTMLElement);
  if (!meta) return;
  const lines = ':is(.setup, section.status):not([data-lr-ext-parts])';
  for (const line of queryAll(meta, lines, HTMLElement)) splitParts(line);
  const links = '.game__meta__players .user-link:not([data-lr-ext-name])';
  for (const link of queryAll(meta, links, HTMLElement)) wrapName(link);
  addComputerRatings(meta, ratings);
}

export const gameMeta: Feature = {
  name: 'game info',
  start: () => onEveryTick('game info', () => syncGameMeta(computerRatings())),
};
