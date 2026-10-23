import type { Color } from '#shared/chess/types.ts';
import type { PracticeHomeStrings } from './practice-mode-types.ts';

// The practice page's home and its own pages, in English.

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

const sideName = (side: Color): string => (side === 'white' ? 'White' : 'Black');

export const homeEn: PracticeHomeStrings = {
  streakDays: days => plural(days, 'day'),
  streakTip: 'Days in a row with the daily goal met',
  today: (moves, goal) => `${Math.min(moves, goal)}/${goal}`,
  todayTip: 'Moves practiced today, of the daily goal',
  known: positions => String(positions),
  knownTip: 'Positions known',
  modes: {
    review: 'Daily review',
    reviewDue: count => `${plural(count, 'position')} due`,
    reviewNone: 'All caught up',
    traps: 'Traps',
    trapsSub: 'Punish the mistakes',
    blitz: 'Speed run',
    blitzSub: best => (best > 0 ? `1 minute · best ${best}` : '1 minute, go!'),
    quiz: 'Name it',
    quizSub: best => (best > 0 ? `Guess the opening · best ${best}` : 'Guess the opening'),
    games: 'My games',
    gamesSub: 'Fix your habits',
    repertoire: 'My repertoire',
    repertoireSub: positions =>
      positions > 0 ? plural(positions, 'position') : 'Your lines, your studies',
  },
  dueTitle: 'Time to review',
  dueWords: count =>
    count === 1 ? 'One position wants a look today!' : `${count} positions want a look today!`,
  favorites: 'Your favorites',
  masteries: { new: 'New', learning: 'Learning', known: 'Known', mastered: 'Mastered' },
  masteryTip: (found, positions) =>
    `${found}% found at the first try, over ${plural(positions, 'position')}`,
  yourPlan: 'Your plan',
  theirPlan: 'Their plan',
  trapsTitle: 'Traps',
  trapsWhy: 'Pick an opening: its real games’ mistakes are yours to punish.',
  gamesTitle: 'My games',
  gamesWhy: 'Your last games, read for the moves you keep getting wrong.',
  gamesLoading: 'Reading your games…',
  gamesFailed: 'Your games didn’t load: try again later.',
  gamesNone: 'No habit to fix in your last games. Well done!',
  drillCard: (times, games) => `in ${times} of ${plural(games, 'game')}`,
  drillWhy: { repertoire: 'Not your repertoire’s move', book: 'The masters play better' },
  drillsStart: 'Fix them all',
  repertoireTitle: 'My repertoire',
  tabs: { mine: 'My lines', studies: 'My studies' },
  treeWhy: 'Your lines, as you play them. Star your favorites!',
  treeEmpty: 'Practice a few lines: the positions you meet show up here.',
  practiceLine: 'Practice this line',
  star: 'Star',
  unstar: 'Unstar',
  prune: 'Remove',
  pruneConfirm: 'Remove this line and everything after it?',
  studiesWhy: 'Train on a study of yours: its moves are the ones to find.',
  studiesLoading: 'Reading your studies…',
  studiesFailed: 'Your studies didn’t load.',
  studiesNone: 'No study of yours yet.',
  chapters: count => plural(count, 'chapter'),
  chapterSide: side => `As ${sideName(side)}`,
  noChapter: 'No chapter to train: they start from a position of their own, or have no move.',
  movesLabel: 'Your moves',
  moves: { mine: 'My repertoire', any: 'Any good move' },
  levelLabel: 'Opponents',
  levels: { all: 'Everyone', mine: 'My level' },
  levelMine: rating => `My level (${rating})`,
  goalLabel: 'Daily goal',
  goal: moves => `${moves} moves`,
  autoLength: 'Grows',
  autoSum: 'Growing lines',
  home: 'Back',
};
