// A time control in a few words, for a "New 10+5" button: the game page's and the review's.

// A game's clock, in seconds.
export interface Clock {
  readonly initial: number;
  readonly increment: number;
}

const NO_BREAK_SPACE = '\u00a0';

/** Lichess's way of writing a clock: "10+5", "3 min", "30 s". */
export function timeControlText({ initial, increment }: Clock): string {
  const minutes = Number((initial / 60).toFixed(2));
  if (increment !== 0) return `${minutes}+${increment}`;
  return initial < 60 ? `${initial} s` : `${minutes} min`;
}

/** "New 10+5", "New 3 min", "Nouvelle 30 s". Where it has to wrap, the time control stays whole. */
export function newGameLabel(clock: Clock, french: boolean): string {
  const text = timeControlText(clock).replaceAll(' ', NO_BREAK_SPACE);
  return french ? `Nouvelle ${text}` : `New ${text}`;
}
