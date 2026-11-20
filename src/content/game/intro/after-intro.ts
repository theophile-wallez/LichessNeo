// What waits for the game's intro: work heavy enough to drop its frames (the
// coach card's mascot, built in three.js, held up the main thread for 200 ms)
// waits until it's over, or until it's clear none will play.

/** The longest a coming intro holds the rest before it starts: the tab may stay hidden. */
const START_WAIT_MS = 4000;

let coming: PromiseWithResolvers<void> | null = null;
let gaveUp: number | undefined;

/** An intro is coming: what waits for it waits from now. */
export function introComing(): void {
  coming ??= Promise.withResolvers<void>();
  window.clearTimeout(gaveUp);
  gaveUp = window.setTimeout(introOver, START_WAIT_MS);
}

/** It started: it holds the rest until it ends, which its own timer sees to. */
export function introStarted(): void {
  window.clearTimeout(gaveUp);
}

/** It's over, or won't play. */
export function introOver(): void {
  window.clearTimeout(gaveUp);
  coming?.resolve();
  coming = null;
}

/** Resolves once no intro is coming or playing. */
export const afterIntro = (): Promise<void> => coming?.promise ?? Promise.resolve();
