import type { PanelStatus } from '#shared/review-engine/panel-view.ts';
import type { PositionState } from '#shared/review-engine/progress-grid.ts';
import type { Session } from '#page/review/session.ts';

// Where the game's analysis stands, as the engine's popover and the closed
// panel's card show it.

export function statusOf({ work }: Session): PanelStatus {
  const total = work.nodes.length;
  const done = work.deep.filter(Boolean).length;
  const running =
    work.aim && (done < total || !work.analysed) ? { done, total, analysed: work.aim } : null;
  return { analysed: work.analysed, running };
}

/** Each position's square in the run's grid. */
export const statesOf = ({ work }: Session): PositionState[] =>
  work.nodes.map((_, i) => {
    if (work.deep[i]) return work.cloud.has(i) ? 'cloud' : 'engine';
    return work.pending.has(i) ? 'busy' : 'todo';
  });
