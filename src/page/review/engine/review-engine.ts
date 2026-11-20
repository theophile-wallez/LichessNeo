import { onReviewEngine, postReviewEnginePick } from '#shared/protocol.ts';
import { keptReviewEngine, type ReviewEngine } from '#shared/review-engine/options.ts';

// The Debrief's engine settings in the page world, which can't read the
// extension's: as the content script last kept them, then as it tells them
// (content/review-engine). The review's popover picks them through it.

let current: ReviewEngine | null = null;
const listeners = new Set<(options: ReviewEngine) => void>();

function settle(options: ReviewEngine): void {
  current = options;
  for (const listener of listeners) listener(options);
}

function load(): ReviewEngine {
  if (current) return current;
  current = keptReviewEngine();
  onReviewEngine(settle);
  return current;
}

export const reviewEngine = (): ReviewEngine => load();

/** Calls `listener` each time the settings change, here or in the settings. */
export function onReviewEngineChange(listener: (options: ReviewEngine) => void): void {
  load();
  listeners.add(listener);
}

/** The popover's pick: at once here, kept by the content script with the other settings. */
export function pickReviewEngine(options: ReviewEngine): void {
  load();
  settle(options);
  postReviewEnginePick(options);
}
