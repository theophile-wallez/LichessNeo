import { STUDIES } from '#page/review/theory/book.ts';
import type { TheorySentences } from './theory-types.ts';

const either = new Intl.ListFormat('en', { type: 'disjunction' });
const percent = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 0 });

export const theoryEn: TheorySentences = {
  study: STUDIES.en,
  next: moves => [`Theory goes on with ${either.format(moves)}.`],
  left: moves => [
    `This leaves the book, where ${either.format(moves)} is played.`,
    `Out of theory: the usual move here is ${either.format(moves)}.`,
  ],
  punish: moves => [
    `The punishment: ${either.format(moves)}.`,
    `It's met by ${either.format(moves)}.`,
  ],
  common: (share, rated) =>
    rated
      ? [
          `A classic mistake: ${percent.format(share)} of players at this level play it here.`,
          `You're not alone: ${percent.format(share)} of players at this rating go wrong the same way here.`,
        ]
      : [`A classic mistake: ${percent.format(share)} of Lichess players play it here.`],
};
