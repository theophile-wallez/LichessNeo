/**
 * Wraps `task` so it runs at most once per animation frame, however many
 * times it is asked for in between.
 */
export function oncePerFrame(task: () => void): () => void {
  let queued = false;
  return () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      task();
    });
  };
}

/**
 * Runs `task` while the page parses, once a frame as its chunks come in (each is a mutation),
 * still before the frame is drawn, and once more when it's parsed; at once on a page already
 * parsed. What it adds is there from the first paint.
 */
export function syncWhileParsing(task: () => void): void {
  if (document.readyState !== 'loading') {
    task();
    return;
  }
  const parsing = new MutationObserver(oncePerFrame(task));
  parsing.observe(document, { childList: true, subtree: true });
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      parsing.disconnect();
      task();
    },
    { once: true },
  );
}
