import { vi } from 'vitest';

/** Waits one macrotask: observers, promise callbacks and 0 ms timers have run by then. */
export const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

/** Waits for the next animation frame, once the promise callbacks queued so far have run. */
export async function nextFrame(): Promise<void> {
  await Promise.resolve();
  await new Promise(resolve => requestAnimationFrame(resolve));
}

/** Runs the next animation frame of fake timers, once the promise callbacks queued so far have run. */
export async function nextFakeFrame(): Promise<void> {
  await Promise.resolve();
  vi.advanceTimersToNextFrame();
}
