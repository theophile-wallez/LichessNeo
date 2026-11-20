import { wrapOrientation } from '#shared/chessground.ts';
import { queryOne } from '#shared/dom.ts';
import {
  keepEndAnimation,
  keepEndResults,
  type EndAnimation,
  type EndResults,
  type GameEnd,
} from '#shared/end-animation.ts';
import type { Feature } from '#shared/features.ts';
import { gameIdFrom } from '#shared/game-path.ts';
import { onGameEnd } from '#shared/protocol.ts';
import { currentSettings, onSettings } from '#content/settings/settings.ts';
import { themeAccent } from './accent.ts';
import { loadWave, warmWave } from './load.ts';
import { endPlan, winPalette } from './plan.ts';

// The board's wave (wave/) as the player's game ends, unless the settings pick
// the confetti or nothing, when the page world says it has (page/game-over). At a
// game's start it's one of the intros (content/game/intro/ripple.ts).

const findBoard = (): HTMLElement | null =>
  queryOne(
    document,
    'main:is(.round, .analyse) :is(.round__app__board, .analyse__board) .cg-wrap',
    HTMLElement,
  );

let playing = false;

/** Plays the end's wave, if the settings pick it, as the page world says the game ended. */
export async function playEndWave(end: GameEnd): Promise<void> {
  const board = findBoard();
  const settings = currentSettings();
  if (!board || playing || settings.endAnimation !== 'wave') return;
  playing = true;
  try {
    const playWave = await loadWave();
    const win = winPalette(settings.endWinColor, themeAccent());
    await playWave?.(findBoard, endPlan(end, wrapOrientation(board), win));
  } finally {
    playing = false;
  }
}

// Kept for the page world, which decides what plays, and whether.
let kept: { readonly pick: EndAnimation; readonly results: EndResults } | null = null;

let warmed = false;

/** On a game's page, with the wave picked, it's readied ahead, so it plays with the last move. */
function preload(pick: EndAnimation): void {
  if (warmed || pick !== 'wave' || gameIdFrom(location.pathname) === null) return;
  warmed = true;
  void warmWave();
}

function keepPick(pick: EndAnimation, results: EndResults): void {
  if (pick !== kept?.pick) keepEndAnimation(pick);
  if (results !== kept?.results) keepEndResults(results);
  kept = { pick, results };
}

export const boardWave: Feature = {
  name: 'board wave',
  start: () => {
    onSettings(settings => {
      keepPick(settings.endAnimation, settings.endResults);
      preload(settings.endAnimation);
    });
    onGameEnd(end => void playEndWave(end));
  },
};
