// One color per rating, the same on every chart of ours: Blitz is as blue on
// a profile's rating history as on its distribution.

const GAME_COLORS: ReadonlyMap<string, string> = new Map([
  ['ultraBullet', '#c084fc'],
  ['bullet', '#f5a93b'],
  ['blitz', '#45a3f5'],
  ['rapid', '#77ba2c'],
  ['classical', '#2dd4bf'],
  ['correspondence', '#fcd34d'],
  ['crazyhouse', '#f472b6'],
  ['chess960', '#a98bf0'],
  ['kingOfTheHill', '#d6a36b'],
  ['threeCheck', '#fb7185'],
  ['antichess', '#94a3b8'],
  ['atomic', '#f87171'],
  ['horde', '#a3e635'],
  ['racingKings', '#67e8f9'],
]);

const PUZZLE_COLOR = '#f06a4a';
const BLITZ_COLOR = '#45a3f5';

// The rating history lists its series in this order, puzzles last. Their
// names are translated, so the order is all that tells them apart.
const SERIES_COLORS: readonly string[] = [...GAME_COLORS.values(), PUZZLE_COLOR];

/** The color of the rating history's series at `index`. */
export const seriesColor = (index: number): string =>
  SERIES_COLORS[index % SERIES_COLORS.length] ?? BLITZ_COLOR;

/** The color of a game rating by its key (`blitz`, `threeCheck`…), Blitz's if unknown. */
export const gameRatingColor = (key: string | undefined): string =>
  (key === undefined ? undefined : GAME_COLORS.get(key)) ?? BLITZ_COLOR;
