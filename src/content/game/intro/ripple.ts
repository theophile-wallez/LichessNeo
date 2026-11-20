import { themeAccent } from '#content/board-wave/accent.ts';
import { loadWave } from '#content/board-wave/load.ts';
import { startPlan } from '#content/board-wave/plan.ts';
import type { Intro, Stage } from './stage.ts';

// The ripple: the board's wave (content/board-wave) runs up the board from the
// player's side in the theme's accent, bending the squares and the pieces as it
// passes. It draws on a canvas of its own, over the board, and goes as the
// intro ends.

/** The wave's second and a half, and room for its bundle and its picture of the board. */
const RIPPLE_MS = 2400;

function play(stage: Stage): void {
  const wrap = stage.board.closest('.cg-wrap');
  if (!(wrap instanceof HTMLElement)) return;
  const stop = new AbortController();
  stage.onEnd(() => stop.abort());
  const plan = startPlan(themeAccent());
  void loadWave().then(playWave =>
    playWave?.(() => (wrap.isConnected ? wrap : null), plan, stop.signal),
  );
}

export const ripple: Intro = { ms: RIPPLE_MS, play };
