import type { CoachMood } from '#shared/coach.ts';
import type { Overview } from './data.ts';

// What the coach says of the period, a tip at a time: the gist first (the best
// and the worst theme against their level), then what stands out. Messages by
// name (public/_locales), with what fills them in, and the face it says it with.

export interface Line {
  readonly name: string;
  readonly values: readonly string[];
}

export interface Tip {
  /** Bold, the gist. */
  readonly lead: Line;
  readonly body: Line;
  readonly mood: CoachMood;
}

// Solved first try at least this often, the puzzles are too easy; at most, too hard.
const EASY = 0.65;
const HARD = 0.4;

const points = (gap: number): string => String(Math.abs(Math.round(gap)));
const line = (name: string, ...values: string[]): Line => ({ name, values });

function gist({ strongest, weakest }: Overview): Tip {
  const [best] = strongest;
  const [worst] = weakest;
  if (best && worst)
    return {
      lead: line('pdashCoachMixed', best.name, worst.name),
      body: line('pdashCoachMixedBody', best.name, points(best.gap), worst.name, points(worst.gap)),
      mood: 'neutral',
    };
  if (best)
    return {
      lead: line('pdashCoachStrong'),
      body: line('pdashCoachStrongBody', best.name, points(best.gap)),
      mood: 'happy',
    };
  if (worst)
    return {
      lead: line('pdashCoachWeak'),
      body: line('pdashCoachWeakBody', worst.name, points(worst.gap)),
      mood: 'worry',
    };
  return { lead: line('pdashCoachEarly'), body: line('pdashCoachEarlyBody'), mood: 'neutral' };
}

function pace({ puzzles, firstWins }: Overview): Tip | null {
  const share = puzzles === 0 ? 0 : firstWins / puzzles;
  const percent = String(Math.round(share * 100));
  if (puzzles >= 10 && share >= EASY)
    return {
      lead: line('pdashCoachEasy'),
      body: line('pdashCoachEasyBody', percent),
      mood: 'delight',
    };
  if (puzzles >= 10 && share <= HARD)
    return {
      lead: line('pdashCoachHard'),
      body: line('pdashCoachHardBody', percent),
      mood: 'doubt',
    };
  return null;
}

/** Every tip worth saying for the period, the gist first. */
export function coachTips(view: Overview): Tip[] {
  const [best] = view.strongest;
  const [worst] = view.weakest;
  const tips: (Tip | null)[] = [
    gist(view),
    best && worst
      ? {
          lead: line('pdashCoachBest', best.name),
          body: line('pdashCoachBestBody', String(best.firstWins), String(best.puzzles)),
          mood: 'delight',
        }
      : null,
    worst && best
      ? {
          lead: line('pdashCoachWorst', worst.name),
          body: line('pdashCoachWorstBody', String(worst.firstWins), String(worst.puzzles)),
          mood: 'doubt',
        }
      : null,
    pace(view),
    view.toReplay > 0
      ? {
          lead: line('pdashCoachReplay', String(view.toReplay)),
          body: line('pdashCoachReplayBody'),
          mood: 'happy',
        }
      : null,
  ];
  return tips.filter(tip => tip !== null);
}
