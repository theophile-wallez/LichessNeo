import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { NavState } from '#page/review/view/nav.ts';
import { canBest, canExplain, canRetry } from './explain.ts';
import { RETRY_START } from './retry.ts';
import type { View } from './scene.ts';

// The card's buttons, as the review's (view/nav.ts draws them): each folds
// away where it has nothing to do. Retrying, Explain and Best would give the
// answer away; while Best shows its move, there's nothing to explain or retry.

export function navState(move: MoveVerdict | null, view: View, canNext: boolean): NavState {
  const retrying = view.kind === 'retry';
  const onLine = (view.kind === 'comment' || view.kind === 'explain') && view.line !== null;
  return {
    explain: {
      on: view.kind === 'explain',
      enabled: !retrying && view.kind !== 'best' && canExplain(move),
    },
    best: { on: view.kind === 'best', enabled: !retrying && !onLine && canBest(move) },
    retry: { on: retrying, enabled: retrying || (view.kind !== 'best' && canRetry(move)) },
    next: { enabled: canNext || retrying },
  };
}

/** The view a button of the card turns to: on, or back to the comment when it's on. */
export function toggled(view: View, button: 'explain' | 'best' | 'retry'): View {
  if (view.kind === button) return { kind: 'comment', line: null };
  if (button === 'retry') return { kind: 'retry', retry: RETRY_START };
  return button === 'best' ? { kind: 'best' } : { kind: 'explain', line: null };
}
