import { setStyleProperty } from '#shared/dom.ts';
import { timePieces } from './pieces.ts';
import type { Intro, Stage } from './stage.ts';
import { addUnderPieces, addWindow, copyDrawing } from './under-pieces.ts';

// The weave: the board is woven rank by rank, from the top, each rank sliding
// in with its pieces from the other side than the one before
// (styles/game/intro/weave.css).

const RANKS = 8;
const STEP = 60;

const sideOf = (y: number): number => (y % 2 === 0 ? -1 : 1);

function play(stage: Stage): void {
  // A 3D board's drawing isn't flat squares: there are no ranks to slide.
  if (!stage.board.closest('.is2d')) return;
  const ranks = addUnderPieces(stage, 'ln-ext-intro-squares');
  if (!ranks) return;
  copyDrawing(stage, ranks);
  for (let y = 0; y < RANKS; y++) {
    const rank = addWindow(ranks, 'ln-ext-intro-squares__rank', 0, y);
    setStyleProperty(rank, '--ln-ext-intro-delay', `${y * STEP}ms`);
    setStyleProperty(rank, '--ln-ext-intro-side', String(sideOf(y)));
  }
  timePieces(
    stage,
    ({ y }) => y * STEP,
    ({ y }) => sideOf(y),
  );
}

export const weave: Intro = { ms: 1050, play };
