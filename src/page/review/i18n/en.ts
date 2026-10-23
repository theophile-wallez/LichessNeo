import { html } from '#shared/html.ts';
import type { Color } from '#shared/chess/types.ts';
import { factsEn } from './en-comment.ts';
import { capitalize, indefinite, partyOf } from './en-grammar.ts';
import { remarksEn } from './en-remarks.ts';
import { theirRemarksEn } from './en-their-remarks.ts';
import { trajectoryEn } from './en-trajectory.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';
import type {
  ClockStrings,
  InterfaceStrings,
  RetryStrings,
  ReviewLanguage,
  Viewer,
} from './types.ts';

const CLASS_LABELS = {
  brilliant: 'Brilliant',
  great: 'Great',
  book: 'Book',
  best: 'Best',
  excellent: 'Excellent',
  good: 'Good',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  miss: 'Miss',
  blunder: 'Blunder',
};

const CLASS_PLURALS: Readonly<Record<MoveClass, string>> = {
  brilliant: 'brilliant moves',
  great: 'great moves',
  book: 'book moves',
  best: 'best moves',
  excellent: 'excellent moves',
  good: 'good moves',
  inaccuracy: 'inaccuracies',
  mistake: 'mistakes',
  miss: 'misses',
  blunder: 'blunders',
};

const INTERFACE: Omit<InterfaceStrings, 'retry' | 'clock' | 'playedLike'> = {
  review: 'Debrief',
  start: 'Start Debrief',
  summary: 'Summary',
  brief: {
    opening: name => html`This game opened with the <b>${name}</b>.`,
    moments: (count, turning) => {
      const found = html`I found <b>${count} key moment${count === 1 ? '' : 's'}</b>`;
      return turning ? html`${found}: the game turned at ${turning}.` : html`${found}.`;
    },
    calm: 'No big error in this game: let’s go through it move by move.',
    theme: (name, count, yours) =>
      html`One theme keeps coming back in ${yours ? 'your' : 'the'} errors: <b>${name}</b>, ${count} times.`,
  },
  next: 'Next',
  graphViews: { advantage: 'Advantage', time: 'Time' },
  share: 'Share & export',
  explain: 'Explain',
  best: 'Best',
  analysing: 'Analyzing game…',
  moves: 'Moves',
  phasesTitle: 'Phases',
  phases: {
    opening: {
      name: 'Opening',
      how: 'The moves before the middlegame, out of book, against what’s expected at the player’s rating.',
    },
    tactics: {
      name: 'Tactical positions',
      how: 'The middlegame’s moves with a tactic on the board (a check, a hanging piece, a mistake to punish), against what’s expected at the player’s rating.',
    },
    strategy: {
      name: 'Quiet positions',
      how: 'The middlegame’s other moves, against what’s expected at the player’s rating.',
    },
    endgame: {
      name: 'Endgame',
      how: 'The moves once six pieces or fewer are left, kings and pawns aside, against what’s expected at the player’s rating.',
    },
  },
  profileTitle: 'Profile',
  profile: {
    opening: {
      name: 'Opening',
      how: 'Accuracy of the moves before the middlegame: until pieces are traded or developed, or the two camps mix.',
    },
    middlegame: {
      name: 'Middlegame',
      how: 'Accuracy of the moves from the middlegame to the endgame.',
    },
    endgame: {
      name: 'Endgame',
      how: 'Accuracy once six pieces or fewer are left, kings and pawns aside.',
    },
    tactics: {
      name: 'Tactics',
      how: 'Share of the tactical chances found: brilliant and great moves, against the chances missed.',
    },
    defense: {
      name: 'Defense',
      how: 'Accuracy of the moves played while worse off, under 35% winning chances.',
    },
    conversion: {
      name: 'Conversion',
      how: 'Accuracy of the moves played while better off, over 65% winning chances.',
    },
  },
  accuracy: 'Accuracy',
  lichessRating: rating => `${rating} on Lichess`,
  anonymous: 'Anonymous',
  close: 'Close debrief',
  back: 'Back',
  coach: 'Change coach',
  intro: "Let's debrief this game!",
  engineError: 'The engine failed to start.',
  liveIntro: {
    title: 'Play a move.',
    sub: 'I’ll tell you if it’s the best, an inaccuracy or a blunder.',
  },
  thinking: [
    'Let me look at this move…',
    'Hmm, let me think…',
    'Give me a second…',
    'Thinking it over…',
    'Let’s see what this does…',
    'One moment, I’m checking…',
  ],
  startPosition: 'Starting position',
  more: 'Show all moves',
  less: 'Show less',
  bestWas: move => `${move} was best.`,
  cost: percent => `−${percent}% winning chances`,
  lines: {
    best: line => `Best was ${line}.`,
    allows: (move, line) => `${move} allows ${line}.`,
    show: 'Show line',
  },
  themes: {
    fork: 'Fork',
    pin: 'Pin',
    skewer: 'Skewer',
    discovered: 'Discovered attack',
    doubleCheck: 'Double check',
    defender: 'Removing the defender',
    trapped: 'Trapped piece',
    hanging: 'Hanging piece',
    mate: 'Checkmate',
    sacrifice: 'Sacrifice',
  },
};

/** "an 1850", "an 800", "a 1500": the article as the number is said ("eighteen fifty"). */
const article = (elo: number): string => (/^(8|11|18)/.test(String(elo)) ? 'an' : 'a');

const playedLike = (viewer: Viewer, color: Color, elo: number | null): [string, string] => {
  const player = capitalize(partyOf(viewer, color).name);
  return [elo === null ? `${player} played like` : `${player} played like ${article(elo)}`, 'Elo'];
};

const retryStrings = (viewer: Viewer): RetryStrings => ({
  button: 'Retry',
  prompt: color =>
    viewer === color
      ? 'Find a better move.'
      : `Find a better move for ${partyOf(viewer, color).name}.`,
  checking: 'Let me see…',
  found: move => `Yes! ${move} is the move.`,
  alsoGood: move => `${move} works too. Well found!`,
  wrong: move => `Not quite: ${move} isn’t it. Try again!`,
  same: 'That’s the move played in the game. Try another one!',
  hint: 'Hint',
  another: 'Another hint',
  hintPiece: piece => `The move is ${indefinite(piece)}.`,
  hintSquare: square => `It starts on ${square}, marked on the board.`,
  reveal: 'Show the answer',
  revealed: best => `The move was ${best}.`,
});

const clockStrings = (viewer: Viewer): ClockStrings => ({
  rushed: (color, spent, clock) =>
    `${capitalize(partyOf(viewer, color).name)} played this in ${spent} with ${clock} remaining on the clock: a little more time here would have paid off.`,
  timeTrouble: clock => `With only ${clock} left on the clock, this was hard to find.`,
  paidOff: (color, spent) =>
    `${capitalize(partyOf(viewer, color).name)} spent ${spent} on this move, and it was worth it.`,
  seconds: seconds => `${seconds} s`,
});

/** English, the coach speaking to `viewer` of their own moves. */
export const english = (viewer: Viewer): ReviewLanguage => ({
  ui: {
    ...INTERFACE,
    playedLike: (color, elo) => playedLike(viewer, color, elo),
    retry: retryStrings(viewer),
    clock: clockStrings(viewer),
  },
  classLabels: CLASS_LABELS,
  classSentences: {
    brilliant: '{m} is brilliant!',
    great: '{m} is a great move',
    book: '{m} is a book move',
    best: '{m} is best',
    excellent: '{m} is excellent',
    good: '{m} is good',
    inaccuracy: '{m} is an inaccuracy',
    mistake: '{m} is a mistake',
    miss: '{m} is a miss',
    blunder: '{m} is a blunder',
  },
  mateSentence: '{m} is checkmate',
  countTip: (color, moveClass, count) =>
    `${color === 'white' ? 'White' : 'Black'}’s ${CLASS_PLURALS[moveClass]}: ${count}`,
  typography: text => text,
  openingLine: name => [
    `Opening: ${name}.`,
    `This is the ${name}.`,
    `The game follows the ${name}.`,
  ],
  viewer,
  // Watching a game, the coach speaks to whoever moved.
  remarks: mover => (viewer === null || mover === viewer ? remarksEn : theirRemarksEn),
  trajectory: trajectoryEn(viewer),
  facts: factsEn(viewer),
});

/** English as a watcher reads it: "White", "Black". */
export const en = english(null);
