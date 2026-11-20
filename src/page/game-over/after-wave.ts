// Stockfish's boot holds up the main thread for half a second (its wasm, its
// memory, then a collection), and the board's wave, which the content script
// draws in a layer of its own (content/board-wave), would stop for as long:
// the game's analysis waits for that layer to go.

const WAVE = '.ln-ext-board-wave';
/** The longest it waits: the end's wave is over in about four seconds. */
const LONGEST_MS = 6000;

/** Resolves once no wave plays over the board. */
export function afterBoardWave(): Promise<void> {
  if (!document.querySelector(WAVE)) return Promise.resolve();
  return new Promise(resolve => {
    const done = (): void => {
      observer.disconnect();
      window.clearTimeout(timer);
      resolve();
    };
    const observer = new MutationObserver(() => {
      if (!document.querySelector(WAVE)) done();
    });
    observer.observe(document.body, { childList: true });
    const timer = window.setTimeout(done, LONGEST_MS);
  });
}
