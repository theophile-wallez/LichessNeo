import { factsEn, trajectoryEn } from './en-comment.ts';
import { remarksEn } from './en-remarks.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';
import type { ReviewLanguage } from './types.ts';

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

export const en: ReviewLanguage = {
  ui: {
    review: 'Game Review',
    start: 'Start Review',
    next: 'Next',
    explain: 'Explain',
    best: 'Best',
    analysing: 'Analyzing game…',
    players: 'Players',
    accuracy: 'Accuracy',
    anonymous: 'Anonymous',
    close: 'Close review',
    back: 'Back',
    coach: 'Change coach',
    intro: "Let's review this game!",
    engineError: 'The engine failed to start.',
    liveIntro: 'Play a move and I’ll tell you what I think.',
    thinking: 'Let me look at this move…',
    startPosition: 'Starting position',
    more: 'Show all moves',
    less: 'Show less',
    gameRating: 'Game Rating',
    gameRatingTip: 'An estimate of a player’s rating based on a single game.',
    phases: { opening: 'Opening', tactics: 'Tactics', strategy: 'Strategy', endgame: 'Endgame' },
    bestWas: move => `${move} was best.`,
    cost: percent => `−${percent}% winning chances`,
    lines: {
      best: line => `Best was ${line}.`,
      allows: (move, line) => `${move} allows ${line}.`,
      show: 'Show line',
    },
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
  countLabel: (moveClass, count) => `${count} ${CLASS_LABELS[moveClass]}`,
  countTip: (color, moveClass, count) =>
    `${color === 'white' ? 'White' : 'Black'}’s ${CLASS_PLURALS[moveClass]}: ${count}`,
  typography: text => text,
  openingLine: name => `Opening: ${name}.`,
  remarks: remarksEn,
  trajectory: trajectoryEn,
  facts: factsEn,
};
