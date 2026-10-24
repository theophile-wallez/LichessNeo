import { message } from '#content/platform/runtime.ts';
import {
  EXAMPLE_PLAYERS,
  formatMinutes,
  formatSeconds,
  hostStart,
  hostTime,
  timeControl,
} from './clock.ts';
import type { SimulFormState } from './read.ts';

// The texts the form's preview, summary and clock card show for what it holds.

export interface SimulSummary {
  /** The simul's name on its card, as the list will show it. */
  readonly cardName: string;
  /** Its time control and variants: "20+60 • Standard, Chess960". */
  readonly cardMeta: string;
  readonly timeControl: string;
  /** The host's initial time, with what each player adds. */
  readonly hostClock: string;
  /** The host's time for a simul of a fair size, its note, and everyone else's. */
  readonly hostTime: string;
  readonly hostNote: string;
  readonly others: string;
  readonly entry: string;
}

function entryText(state: SimulFormState): string {
  const [first, ...more] = state.conditions;
  if (first === undefined) return state.noRestriction;
  return more.length ? message('simulFormConditions', String(state.conditions.length)) : first;
}

export function summarize(state: SimulFormState): SimulSummary {
  const { clock } = state;
  const perPlayer = clock.hostPerPlayer > 0;
  const start = formatMinutes(hostStart(clock));
  return {
    cardName: [state.name, state.suffix].filter(Boolean).join(' '),
    cardMeta: [timeControl(clock), state.variants.join(', ')].filter(Boolean).join(' • '),
    timeControl: timeControl(clock),
    hostClock: perPlayer
      ? message('simulFormPerPlayer', start, formatSeconds(clock.hostPerPlayer))
      : start,
    hostTime: perPlayer ? formatMinutes(hostTime(clock, EXAMPLE_PLAYERS)) : start,
    hostNote: perPlayer
      ? message('simulFormClockWith', String(EXAMPLE_PLAYERS))
      : message('simulFormClockAlone'),
    others: message('simulFormClockOthers', formatMinutes(clock.minutes)),
    entry: entryText(state),
  };
}
