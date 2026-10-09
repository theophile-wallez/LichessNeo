import { createElement, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { isFrench } from '#shared/lang.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { finishedGame, type FinishedGame } from './move-times.ts';
import { newGameLabel } from './time-control.ts';

// A "New 10 min" button next to Rematch (styles/game/game-over.css). Lichess
// only offers "New opponent" for lobby and pool games; elsewhere we add a
// button doing what it does, a lobby seek like this game (`/?hook_like=<id>`).
// Either one gets the time control as its label.

export function syncNewGame(game: FinishedGame | null): void {
  const followUp = queryOne(document, 'main.round .rcontrols .follow-up', HTMLElement);
  if (!followUp || !game) return;
  const label = newGameLabel(game.clock, isFrench());
  const lichessButton = queryOne(followUp, '.new-opponent', HTMLElement);
  if (lichessButton) {
    setData(lichessButton, 'lrExtLabel', label);
    return;
  }
  // Players only: a spectator's follow-up has no rematch button.
  if (!followUp.querySelector('.rematch') || followUp.querySelector('.lr-ext-new-game')) return;
  const button = createElement('a', { className: 'fbt lr-ext-new-game', text: label });
  button.href = `/?hook_like=${game.id}`;
  followUp.prepend(button);
}

export const newGame: Feature = {
  name: 'new game button',
  start: () => onEveryTick('new game button', () => syncNewGame(finishedGame())),
};
