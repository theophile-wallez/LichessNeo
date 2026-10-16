export interface PollOptions {
  readonly intervalMs: number;
  /** How long after the first try to stop. */
  readonly giveUpMs: number;
  /** Asked after each miss; false stops at once, as the value is no longer coming. */
  readonly worthWaiting?: () => boolean;
}

/**
 * Calls `read` now, then every `intervalMs` until it gives a value, and hands
 * that to `found`. For what Lichess only sets up after our script starts.
 */
export function pollUntil<T>(
  read: () => T | null,
  found: (value: T) => void,
  { intervalMs, giveUpMs, worthWaiting = () => true }: PollOptions,
): void {
  const started = Date.now();
  const attempt = (): void => {
    const value = read();
    if (value !== null) found(value);
    else if (worthWaiting() && Date.now() - started < giveUpMs) setTimeout(attempt, intervalMs);
  };
  attempt();
}

/**
 * Calls `read` now, then after each change to the page until it gives a value,
 * and hands that to `found`. A mutation's callback runs before the frame is
 * drawn: what `found` adds shows in the same frame as what Lichess drew.
 */
export function watchUntil<T>(
  read: () => T | null,
  found: (value: T) => void,
  giveUpMs: number,
): void {
  const value = read();
  if (value !== null) {
    found(value);
    return;
  }
  const observer = new MutationObserver(() => {
    const ready = read();
    if (ready === null) return;
    observer.disconnect();
    found(ready);
  });
  observer.observe(document, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), giveUpMs);
}
