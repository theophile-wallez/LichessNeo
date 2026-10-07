import type { Clock } from './clock-times.ts';

const NO_BREAK_SPACE = '\u00a0';

// Lichess's way of writing a clock with an increment: "10+5".
function timeControlText({ initial, increment }: Clock): string {
  const minutes = Number((initial / 60).toFixed(2));
  if (increment !== 0) return `${minutes}+${increment}`;
  return initial < 60 ? `${initial} s` : `${minutes} min`;
}

/** "New 10+5", "New 3 min", "Nouvelle 30 s". Where it has to wrap, the time control stays whole. */
export function newGameLabel(clock: Clock, french: boolean): string {
  const text = timeControlText(clock).replaceAll(' ', NO_BREAK_SPACE);
  return french ? `Nouvelle ${text}` : `New ${text}`;
}
