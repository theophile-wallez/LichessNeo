import { chapterOf } from './chapters.ts';
import { type Opening, OPENINGS } from './openings.ts';

// The quiz: an opening's position on the board, four names to pick from, the
// three wrong ones of other openings, so that a variation's family is never
// a wrong answer that's right.

export const QUIZ_QUESTIONS = 10;
const CHOICES = 4;

export interface QuizQuestion {
  readonly opening: Opening;
  readonly choices: readonly string[];
}

export interface Quiz {
  readonly questions: readonly QuizQuestion[];
  index: number;
  score: number;
  /** The name picked for the question on the board, until the next. */
  answered: string | null;
  over: boolean;
  /** The score beat the best, once over. */
  record: boolean;
}

const shuffled = <T>(items: readonly T[], random: () => number): T[] =>
  items
    .map(item => ({ item, order: random() }))
    .toSorted((first, second) => first.order - second.order)
    .map(({ item }) => item);

export function quizQuestions(random: () => number): QuizQuestion[] {
  return shuffled(OPENINGS, random)
    .slice(0, QUIZ_QUESTIONS)
    .map(opening => {
      const family = chapterOf(opening.name);
      const others = shuffled(
        [...new Set(OPENINGS.map(each => each.name))].filter(name => chapterOf(name) !== family),
        random,
      ).slice(0, CHOICES - 1);
      return { opening, choices: shuffled([opening.name, ...others], random) };
    });
}

export const freshQuiz = (random: () => number): Quiz => ({
  questions: quizQuestions(random),
  index: 0,
  score: 0,
  answered: null,
  over: false,
  record: false,
});
