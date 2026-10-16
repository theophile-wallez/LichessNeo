import { createElement, queryOne, setData } from '#shared/dom.ts';
import { speedOfPool } from './pools.ts';

// The hero's first button (styles/home/hero.css), in place of Lichess's "Create a game", which
// stays hidden for the cards' "Custom game" to click: a game in the pool the player last played.
// Lichess draws its start buttons again once its lobby boots: ours is put back at once.

export interface PlayButton {
  readonly pool: string;
  readonly label: string;
  readonly seeking: boolean;
}

function button(start: HTMLElement, onClick: (pool: string) => void): HTMLButtonElement {
  const found = queryOne(start, ':scope > .lr-ext-play', HTMLButtonElement);
  if (found) return found;
  // Lichess's classes, for its buttons' look and the tooltips they go without.
  const created = createElement('button', {
    className: 'button button-metal lobby__start__button lr-ext-play',
    attrs: { type: 'button' },
  });
  created.addEventListener('click', () => {
    const pool = created.dataset.lrExtPool;
    if (pool && !created.classList.contains('disabled')) onClick(pool);
  });
  start.prepend(created);
  return created;
}

function draw(start: HTMLElement, play: PlayButton, onClick: (pool: string) => void): void {
  const element = button(start, onClick);
  if (element.textContent !== play.label) element.textContent = play.label;
  setData(element, 'lrExtPool', play.pool);
  setData(element, 'lrExtSpeed', speedOfPool(play.pool) ?? null);
  element.classList.toggle('lr-ext-play--seeking', play.seeking);
  // Lichess's own is off while the player can't seek a game: one going on, a playban.
  const hook = queryOne(start, '.lobby__start__button--hook', HTMLElement);
  element.classList.toggle('disabled', hook?.classList.contains('disabled') === true);
}

/** Keeps the hero's play button drawn as `current()` says, `onClick` called with its pool. */
export function createPlayButton(
  current: () => PlayButton,
  onClick: (pool: string) => void,
): () => void {
  let table: HTMLElement | null = null;
  const observer = new MutationObserver(() => sync());
  function sync(): void {
    const found = queryOne(document, 'main.lobby .lobby__table', HTMLElement);
    if (found !== table) {
      table = found;
      observer.disconnect();
      if (table) observer.observe(table, { childList: true });
    }
    const start = table && queryOne(table, ':scope > .lobby__start', HTMLElement);
    if (start) draw(start, current(), onClick);
  }
  return sync;
}
