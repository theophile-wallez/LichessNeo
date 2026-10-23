import type { Color } from '#shared/chess/types.ts';
import type { Mastery } from '#page/review/practice/mastery.ts';
import type { OwnKind, PracticeModeStrings, Standing } from './practice-mode-types.ts';

// The coach's words in practice's modes, in English.

const sideName = (side: Color): string => (side === 'white' ? 'White' : 'Black');

const STANDINGS: Readonly<Record<Standing, (side: Color) => string>> = {
  equal: () => 'it’s even again',
  better: side => `${sideName(side)} is a bit better`,
  clearly: side => `${sideName(side)} is clearly better`,
  winning: side => `${sideName(side)} is winning`,
};

const OWN: Readonly<Record<OwnKind, string>> = {
  study: 'your study',
  repertoire: 'your repertoire',
};

const MASTERIES: Readonly<Record<Mastery, string>> = {
  new: 'new',
  learning: 'learning',
  known: 'known',
  mastered: 'mastered',
};

const THEMES: Readonly<Record<string, string>> = {
  fork: 'Look for a fork!',
  pin: 'There’s a pin to use!',
  skewer: 'A skewer is waiting!',
  discoveredAttack: 'Think discovered attack!',
  hangingPiece: 'Something’s hanging!',
  trappedPiece: 'A piece is trapped!',
  mateIn1: 'Mate in one!',
  mateIn2: 'Mate in two!',
  mateIn3: 'Mate in three!',
  doubleCheck: 'Double check!',
  sacrifice: 'Don’t fear a sacrifice!',
  deflection: 'Lure a defender away!',
  attraction: 'Pull the king out!',
  kingsideAttack: 'Go for the king!',
};

const games = (count: number): string => `${count} game${count === 1 ? '' : 's'}`;

export const modesEn: PracticeModeStrings = {
  deviatedTitle: '{m} isn’t your move',
  deviated: ['Your repertoire plays something else here!', 'Not your usual move!'],
  deviatedChoice: move => `Take it back, or make ${move} yours.`,
  adopt: 'Make it mine',
  refutation: (move, reply, standing, side) => [
    `After ${move}, ${reply}! and ${STANDINGS[standing](side)}.`,
    `${move} runs into ${reply}: ${STANDINGS[standing](side)}.`,
  ],
  ownIntro: (kind, name) =>
    kind === 'study'
      ? [`${name}: show me your prep!`, `Your study, ${name}. Let’s see it!`]
      : ['Your repertoire, line by line!', 'Let’s play your repertoire!'],
  ownMain: kind => [`The main line of ${OWN[kind]}.`, `Straight from ${OWN[kind]}!`],
  ownOther: kind => [`One of the lines of ${OWN[kind]}.`, `A line of ${OWN[kind]}, too.`],
  ownOut: (kind, move) => [`${move} isn’t in ${OWN[kind]}.`, `${move}? Not in ${OWN[kind]}.`],
  ownFind: kind => [`Find the move of ${OWN[kind]}!`, `What does ${OWN[kind]} play?`],
  ownOutTitle: kind => `{m} isn’t in ${OWN[kind]}`,
  revealedTitle: '{m} was the move',
  habitTitle: '{m}, as usual',
  habit: move => [`${move} again! Find better.`, `That’s your habit, ${move}: try another!`],
  aimMissed: ['Not that one: find better!', 'Hmm, there’s better!'],
  gamesIntro: (times, of, move) => `You played ${move} here in ${times} of your ${games(of)}.`,
  gamesFind: why =>
    why === 'repertoire'
      ? ['Play your repertoire’s move!', 'Your repertoire has another move!']
      : ['Find what the masters play!', 'The masters play something else!'],
  gamesDone: ['Habit fixed!', 'Better already!', 'That’s the one!'],
  nextDrill: 'Next',
  goalMet: days =>
    days > 1 ? `Daily goal met! ${days} days in a row.` : 'Daily goal met! See you tomorrow.',
  mastery: (name, mastery) => `${name}: ${MASTERIES[mastery]}!`,
  grew: moves =>
    moves === 0
      ? 'Clean! Next time, to the end of the book.'
      : `Clean! Next time, ${moves} moves deep.`,
  reviewIntro: ['Remember this one?', 'You’ve been here before!', 'What do you play here?'],
  reviewFound: ['Got it!', 'Yes!', 'Still sharp!', 'Remembered!'],
  reviewDone: 'Review done!',
  reviewSummary: (clean, total) => `${clean} of ${total} at the first try.`,
  blitzGo: ['Play it!', 'Go!', 'Quick!'],
  blitzMissed: 'It was {m}!',
  timeUp: 'Time’s up!',
  blitzScore: (score, played) => `${score} right out of ${played}.`,
  blitzNone: ['Not a move? Go again!', 'Too slow! Another go?'],
  newRecord: ['New record!', 'Your best ever!'],
  bestWas: best => `Your best: ${best}.`,
  playAgain: 'Play again',
  trapWatch: 'Trap ahead',
  trapWatchWords: ['Watch their move…', 'Here it comes…'],
  trapTitle: 'Punish it!',
  trapIntro: move => [`${move}? Make them pay!`, `They played ${move}: punish it!`],
  trapTheme: theme => THEMES[theme] ?? null,
  trapDone: ['Trap punished!', 'Got them!', 'Ouch, for them!'],
  trapsSummary: (solved, total) => `${solved} of ${total} punished at the first try.`,
  nextTrap: 'Next trap',
  trapsLoading: 'Setting the traps…',
  trapsFailed: 'Lichess needs a breather: try again in a few minutes.',
  noTraps: 'No trap found for this opening.',
  quizTitle: 'Which opening is this?',
  quizWords: ['Name it!', 'Guess the opening!', 'Know this one?'],
  quizRight: name => [`Yes! ${name}.`, `Right, ${name}!`],
  quizWrong: name => [`No, it’s ${name}.`, `Not quite: ${name}.`],
  quizDone: 'Quiz done!',
  quizScore: (score, total) => `${score} of ${total} right.`,
  finish: 'Done',
  next: 'Next',
};
