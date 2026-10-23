import { describe, expect, it } from 'vitest';
import { chapterOf } from './chapters.ts';
import { freshQuiz, QUIZ_QUESTIONS, quizQuestions } from './quiz.ts';

/** A seeded random, so that each run asks the same quiz. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

describe('quizQuestions', () => {
  it.each([1, 7, 42, 2026])('asks ten openings, each among four names (seed %i)', seed => {
    const questions = quizQuestions(seeded(seed));
    expect(questions).toHaveLength(QUIZ_QUESTIONS);
    expect(new Set(questions.map(question => question.opening.name)).size).toBe(QUIZ_QUESTIONS);
    for (const { opening, choices } of questions) {
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      expect(choices).toContain(opening.name);
      // A variation's family is never a wrong answer.
      const family = chapterOf(opening.name);
      const wrong = choices.filter(choice => choice !== opening.name);
      expect(wrong.every(choice => chapterOf(choice) !== family)).toBe(true);
    }
  });

  it('shuffles the right answer among the others', () => {
    const places = new Set(
      [1, 2, 3, 4, 5, 6].flatMap(seed =>
        quizQuestions(seeded(seed)).map(({ opening, choices }) => choices.indexOf(opening.name)),
      ),
    );
    expect(places).toEqual(new Set([0, 1, 2, 3]));
  });
});

describe('freshQuiz', () => {
  it('starts on the first question, nothing scored', () => {
    const quiz = freshQuiz(seeded(3));
    expect(quiz).toMatchObject({ index: 0, score: 0, answered: null, over: false, record: false });
    expect(quiz.questions).toEqual(quizQuestions(seeded(3)));
  });
});
