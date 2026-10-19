import { timePieces } from './pieces.ts';
import { addPart, copyAvatarData, ringAvatar, type Intro, type Stage } from './stage.ts';

// The two camps: each half of the board washes in its player's hue, their
// avatar's, from its edge to the middle, where a line of light meets in a
// flash; then each side's pieces hop, file by file (styles/game/intro/camps.css).

function play(stage: Stage): void {
  for (const [side, name] of [
    [stage.top, 'top'],
    [stage.bottom, 'bottom'],
  ] as const) {
    copyAvatarData(
      addPart(stage, `ln-ext-intro-camps__wash ln-ext-intro-camps__wash--${name}`),
      side,
    );
    copyAvatarData(
      addPart(stage, `ln-ext-intro-camps__line ln-ext-intro-camps__line--${name}`),
      side,
    );
    ringAvatar(stage, side, name);
  }
  addPart(stage, 'ln-ext-intro-camps__flash');
  timePieces(
    stage,
    ({ piece, y, x }) => (y < 4 ? 640 : 700) + x * 35 + (piece.role === 'pawn' ? 0 : 60),
  );
}

export const camps: Intro = { ms: 2000, play };
