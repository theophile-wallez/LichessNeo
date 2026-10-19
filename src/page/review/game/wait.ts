import type { Analysis } from '#page/lichess/analysis.ts';

// When the game's analysis may use the processor: not in a hidden tab, and,
// on the analysis page, not while "Learn from your mistakes" runs Lichess's
// own engine.

// How often a paused analysis checks whether Lichess's exercise has ended.
const EXERCISE_CHECK_MS = 500;

export const pause = (milliseconds: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });

const whenVisible = (): Promise<void> =>
  new Promise(resolve => {
    if (!document.hidden) {
      resolve();
      return;
    }
    const shown = (): void => {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', shown);
      resolve();
    };
    document.addEventListener('visibilitychange', shown);
  });

export async function whenFree(analysis: Analysis): Promise<void> {
  await whenVisible();
  while (analysis.retroOn) {
    await pause(EXERCISE_CHECK_MS);
    await whenVisible();
  }
}
