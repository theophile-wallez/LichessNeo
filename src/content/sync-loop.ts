// Most of what the content script adds follows the page as Lichess redraws
// it. Rather than one observer per feature, each registers a task on one
// interval; tasks run in registration order and must be cheap when there's
// nothing to do. A hidden tab skips them, and catches up as it shows again.

const INTERVAL_MS = 250;

interface Task {
  readonly name: string;
  readonly run: () => void;
}

const tasks: Task[] = [];
const failed = new Set<string>();

/** Runs `run` on every tick of the sync loop, after the tasks registered before it. */
export function onEveryTick(name: string, run: () => void): void {
  tasks.push({ name, run });
}

function tick(): void {
  for (const task of tasks) {
    try {
      task.run();
    } catch (error) {
      // Report a broken task once, not four times a second.
      if (!failed.has(task.name)) console.error(`[LichessNeo] ${task.name} failed`, error);
      failed.add(task.name);
    }
  }
}

export function startSyncLoop(): void {
  setInterval(() => {
    if (!document.hidden) tick();
  }, INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick();
  });
}
