import { describe, expect, it } from 'vitest';
import { readSaying } from './saying.ts';

// A stage's panel as lila draws it (ui/learn/src/run/runView.ts).
function table(middle: string, level = '/learn#/2/3'): HTMLElement {
  const element = document.createElement('div');
  element.className = 'learn__table';
  element.innerHTML =
    `<div class="wrap"><div class="title"><h2>The rook</h2></div>${middle}` +
    `<div class="progress"><a href="/learn#/2/1"></a><a class="active" href="${level}"></a></div></div>`;
  return element;
}

const won = (words: string): HTMLElement =>
  table(`<div class="result completed next"><h2>${words}</h2><button>Next</button></div>`);

describe('readSaying', () => {
  it('says the level’s goal on one line, keyed by its level', () => {
    const saying = readSaying(table('<div class="goal">Grab all<br>the  stars!</div>'));
    expect(saying).toEqual({
      key: 'goal /learn#/2/3 Grab all the stars!',
      text: 'Grab all the stars!',
      mood: 'neutral',
    });
    expect(
      readSaying(table('<div class="goal">Grab all the stars!</div>', '/learn#/2/4'))?.key,
    ).toBe('goal /learn#/2/4 Grab all the stars!');
  });

  it('cheers a level won, keeping its key as Lichess picks its words anew', () => {
    expect(readSaying(won('Excellent!'))).toEqual({
      key: 'completed /learn#/2/3',
      text: 'Excellent!',
      mood: 'delight',
    });
    expect(readSaying(won('Great job!'))?.key).toBe('completed /learn#/2/3');
  });

  it('comforts a level failed', () => {
    const saying = readSaying(
      table('<div class="result failed"><h2>Puzzle failed!</h2><button>Retry</button></div>'),
    );
    expect(saying).toEqual({ key: 'failed /learn#/2/3', text: 'Puzzle failed!', mood: 'worry' });
  });

  it('says nothing while the panel has no words', () => {
    expect(readSaying(table(''))).toBeNull();
    expect(readSaying(table('<div class="goal"> </div>'))).toBeNull();
    expect(readSaying(table('<div class="result completed"></div>'))).toBeNull();
  });
});
