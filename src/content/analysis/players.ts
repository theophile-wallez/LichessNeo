import { opposite } from '#shared/chess/types.ts';
import { wrapOrientation } from '#shared/chessground.ts';
import { createElement, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { fillPlayerBar } from './player-bar.ts';

// The analysis board's player bars, like the game page's. Lichess names the
// players only in the game info, which styles/analysis/ hides, so each one is
// copied into a bar of ours.

/** A sync task keeping the two bars in step with the game info and the board's orientation. */
export function createPlayersSync(): () => void {
  const ownTopBar = createOwnedElement(() =>
    createElement('div', { className: 'ln-ext-player ln-ext-player--top' }),
  );
  const ownBottomBar = createOwnedElement(() =>
    createElement('div', { className: 'ln-ext-player ln-ext-player--bottom' }),
  );
  let lastKey = '';
  return () => {
    const main = queryOne(document, 'main.analyse', HTMLElement);
    const wrap = main && queryOne(main, '.analyse__board > .cg-wrap', Element);
    const meta = main && queryOne(main, '.game__meta__players', Element);
    if (!main || !wrap || !meta || main.querySelector('.practice__side')) return;
    const topBar = ownTopBar(main);
    const bottomBar = ownBottomBar(main);
    if (topBar.isNew || bottomBar.isNew) lastKey = '';
    // Flipping the board swaps them.
    const bottomColor = wrapOrientation(wrap);
    const key = bottomColor + meta.innerHTML;
    if (key === lastKey) return;
    lastKey = key;
    fillPlayerBar(topBar.element, meta.querySelector(`.player.${opposite(bottomColor)}`));
    fillPlayerBar(bottomBar.element, meta.querySelector(`.player.${bottomColor}`));
  };
}

export const analysisPlayers: Feature = {
  name: 'analysis players',
  start: () => onEveryTick('analysis players', createPlayersSync()),
};
