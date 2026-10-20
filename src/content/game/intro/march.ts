import { timePieces } from './pieces.ts';
import type { Intro, Stage } from './stage.ts';

// The march: each army marches onto the board from its own edge, in
// formation, two squares in two steps, file by file, the player's first; each
// player's avatar pops as their army stands (styles/game/intro/march.css).

function play(stage: Stage): void {
  timePieces(
    stage,
    ({ x, y }) => (y < 4 ? 90 : 0) + x * 30,
    ({ y }) => (y < 4 ? -1 : 1),
  );
}

export const march: Intro = { ms: 1150, play };
