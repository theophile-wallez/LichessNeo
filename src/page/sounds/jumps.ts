import type { SoundName } from '#shared/sounds.ts';
import { boardOrientation, mainBoardWrap, readBoard } from './board-reader.ts';
import { soundOfShownMove } from './choose.ts';
import type { SoundSession } from './session.ts';

// Lichess sounds a step forward only, but has the SAN spoken on every jump,
// in the same task as the step's sound. A jump that got none (a step back, a
// click in the move list) gets the sound of the move it lands on.

export interface JumpSounds {
  /** A move sound played: a jump in the same task needs no other. */
  moved(): void;
  /** Lichess moved the board to the move `san`, or to the start (none). */
  jumped(san: string | undefined): void;
}

export function watchJumps(
  session: SoundSession,
  play: (name: SoundName, san: string | undefined) => unknown,
): JumpSounds {
  let movedThisTask = false;
  let pending: number | null = null;
  const cancel = (): void => {
    if (pending !== null) cancelAnimationFrame(pending);
    pending = null;
  };
  return {
    moved() {
      movedThisTask = true;
      queueMicrotask(() => {
        movedThisTask = false;
      });
      // The review steps back, then plays a move off the board: that one speaks.
      cancel();
    },
    jumped(san) {
      if (movedThisTask) return;
      cancel();
      // The board is redrawn on the next frame: read whose move it was after that.
      pending = requestAnimationFrame(() => {
        pending = null;
        const pieces = readBoard(mainBoardWrap())?.pieces ?? null;
        session.lastPieces = pieces ?? session.lastPieces;
        play(soundOfShownMove(san, pieces ?? new Map(), boardOrientation()), san);
      });
    },
  };
}
