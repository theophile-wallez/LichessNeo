// A mate's own sound, a set's `checkmate` (Boxwood's: a piece knocked over,
// rocking still), played after the move's, whatever that was. It ends the
// game, so Lichess's victory or defeat, which follows it, is left out.

// About a move sound's length, for one whose end can't be awaited.
const MOVE_SOUND_MS = 300;
// A beat between the move and the fall, so they're heard apart.
const PAUSE_MS = 250;
// Lichess's victory or defeat comes once the server ends the game, just after its last move.
const GAME_END_WINDOW_MS = 3000;

export const isMate = (san: string): boolean => san.endsWith('#');

export interface MateSoundOptions {
  /** Whether the set has a mate's sound. */
  readonly has: () => boolean;
  readonly play: (volume: unknown) => unknown;
  /** When the last move sound played. */
  readonly lastMoveAt: () => number;
}

export interface MateSound {
  /** A mate is coming: the game's end that follows it stays quiet. */
  expect(): void;
  /** The move just sounded mates; `played` is what playing its sound returned. */
  mated(volume: unknown, played?: unknown): void;
  /** Whether a game-end sound now would follow a mate's. */
  ended(): boolean;
}

export function createMateSound({ has, play, lastMoveAt }: MateSoundOptions): MateSound {
  let mateAt = Number.NEGATIVE_INFINITY;
  return {
    expect() {
      mateAt = Date.now();
    },
    mated(volume, played) {
      if (!has()) return;
      mateAt = Date.now();
      const fall = (delay: number): void => {
        setTimeout(() => play(volume), Math.max(0, delay));
      };
      const afterPause = (): void => fall(PAUSE_MS);
      // Lichess's play() settles once the sound has played out.
      if (played instanceof Promise) {
        void played.then(afterPause, afterPause);
        return;
      }
      fall(MOVE_SOUND_MS + PAUSE_MS - (mateAt - lastMoveAt()));
    },
    ended: () => has() && Date.now() - mateAt < GAME_END_WINDOW_MS,
  };
}
