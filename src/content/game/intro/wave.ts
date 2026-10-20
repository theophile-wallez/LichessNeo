import { createElement, setStyleProperty } from '#shared/dom.ts';
import { timePieces } from './pieces.ts';
import type { Intro, Stage } from './stage.ts';
import { addUnderPieces } from './under-pieces.ts';

// The wave: a band of light runs up the board rank by rank, from the player's
// side, and each rank's pieces hop as it passes; the player's avatar pops as
// it sets off, the opponent's as it arrives (styles/game/intro/wave.css).

const RANKS = 8;
const STEP = 80;

const delayOf = (y: number): number => 60 + (RANKS - 1 - y) * STEP;

function play(stage: Stage): void {
  // Flat bands of light would float over a 3D board's squares.
  if (!stage.board.closest('.is2d')) return;
  const lights = addUnderPieces(stage, 'ln-ext-intro-wave');
  if (!lights) return;
  for (let y = 0; y < RANKS; y++) {
    const light = createElement('i');
    setStyleProperty(light, '--ln-ext-intro-y', String(y));
    setStyleProperty(light, '--ln-ext-intro-delay', `${delayOf(y)}ms`);
    lights.append(light);
  }
  timePieces(stage, ({ y }) => delayOf(y) + 40);
}

export const wave: Intro = { ms: 1150, play };
