import { describe, expect, it } from 'vitest';
import { readExercise, readSaying } from './saying.ts';

const CHAPTERS =
  '<div class="practice__side__chapters">' +
  '<a class="ps__chapter" data-id="a1"><span class="status done"></span><h3>Back-Rank Mate #1</h3></a>' +
  '<a class="ps__chapter active" data-id="b2"><span class="status"></span><h3> Hook\n  Mate #1 </h3></a>' +
  '<a class="ps__chapter" data-id="c3"><span class="status"></span><h3>Hook Mate #2</h3></a>' +
  '</div>';

const element = (markup: string): HTMLElement => {
  const root = document.createElement('div');
  root.innerHTML = markup;
  return root;
};

const MISSED = { exercise: 'b2', missed: 'Not quite!' };

describe('a practice exercise', () => {
  it('reads its place in the lesson and its name', () => {
    expect(readExercise(element(CHAPTERS))).toEqual({ id: 'b2', label: '2 / 3 · Hook Mate #1' });
  });

  it('is its place alone without a name', () => {
    const side = element(CHAPTERS.replace('<h3> Hook\n  Mate #1 </h3>', ''));
    expect(readExercise(side)).toEqual({ id: 'b2', label: '2 / 3' });
  });

  it('is none while no exercise is on show', () => {
    expect(readExercise(element(CHAPTERS.replace(' active', '')))).toBeNull();
  });
});

describe('what the practice coach says', () => {
  it('says the goal, once per exercise and goal', () => {
    const underboard = element(
      '<div class="feedback ongoing"><div class="goal">Checkmate the  opponent</div>' +
        '<div class="comment">Use your queen.</div></div>',
    );
    expect(readSaying(underboard, MISSED)).toEqual({
      key: 'goal b2 Checkmate the opponent',
      text: 'Checkmate the opponent',
      mood: 'neutral',
    });
  });

  it('comforts in its own words when the exercise is missed', () => {
    const underboard = element(
      '<a class="feedback fail"><span>Puzzle failed!</span><strong>Click to retry</strong></a>',
    );
    expect(readSaying(underboard, MISSED)).toEqual({
      key: 'fail b2',
      text: 'Not quite!',
      mood: 'worry',
    });
  });

  it('cheers in Lichess’s words when it is solved', () => {
    const underboard = element(
      '<a class="feedback win"><span>Success!</span><strong>Go to next exercise</strong></a>',
    );
    expect(readSaying(underboard, MISSED)).toEqual({
      key: 'win b2',
      text: 'Success!',
      mood: 'delight',
    });
  });

  it('says nothing while the card shows no goal', () => {
    expect(readSaying(element(''), MISSED)).toBeNull();
    expect(readSaying(element('<div class="feedback ongoing"></div>'), MISSED)).toBeNull();
  });
});
