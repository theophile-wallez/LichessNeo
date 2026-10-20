// Which take of a sound plays: one at random, never the one just played, so
// two moves in a row don't sound like a copy of each other. A slide's takes
// come in even groups, one per reach from two squares to seven, shortest first
// (RECORDED_TAKES): a slide plays one of its reach's group.

/** Picks a take of `name` out of `count`; `reach` is how many squares a slide went. */
export type PickTake = (name: string, count: number, reach?: number) => number;

const SHORTEST_REACH = 2;
const LONGEST_REACH = 7;
const REACHES = LONGEST_REACH - SHORTEST_REACH + 1;

/** The takes a slide of `reach` squares may play, from `first` up to before `end`. */
export function takesForReach(count: number, reach: number): { first: number; end: number } {
  const group = Math.min(Math.max(reach, SHORTEST_REACH), LONGEST_REACH) - SHORTEST_REACH;
  // Fewer takes than reaches: the nearest one.
  const first = Math.min(Math.floor((group * count) / REACHES), count - 1);
  return { first, end: Math.max(Math.floor(((group + 1) * count) / REACHES), first + 1) };
}

export function createTakePicker(random: () => number = Math.random): PickTake {
  const last = new Map<string, number>();
  return (name, count, reach) => {
    const { first, end } =
      reach === undefined ? { first: 0, end: count } : takesForReach(count, reach);
    const previous = last.get(name);
    const choices: number[] = [];
    for (let take = first; take < end; take++) if (take !== previous) choices.push(take);
    const take = choices[Math.floor(random() * choices.length)] ?? first;
    last.set(name, take);
    return take;
  };
}
