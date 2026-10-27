import { describe, expect, it } from 'vitest';
import { readTurn } from './turn.ts';

// The drill box as lila draws it (ui/analyse/src/practice/practiceView.ts).
const box = (state: string, instruction: string, comment = '', king = 'white'): HTMLElement => {
  const root = document.createElement('div');
  root.className = `practice-box training-box sub-box ${state}`;
  root.innerHTML =
    '<div class="title">Practice with computer</div><div class="feedback"><div class="player running">' +
    `<div class="no-square"><piece class="king ${king}"></piece></div>` +
    `<div class="instruction">${instruction}</div></div></div>` +
    `<div class="comment">${comment}</div>`;
  return root;
};

const YOUR_TURN = '<strong>Your turn</strong><div class="choices"><a>Get a hint</a></div>';

describe('a practice drill’s turn', () => {
  it('reads whose turn it is, the side played and the hint', () => {
    expect(readTurn(box('no-verdict', YOUR_TURN))).toEqual({
      color: 'white',
      status: 'Your turn',
      hint: 'Get a hint',
      verdict: '',
      advice: '',
      quality: null,
    });
  });

  it('reads the last move’s verdict apart from its advice', () => {
    const turn = readTurn(
      box(
        'goodMove',
        YOUR_TURN,
        '<span class="verdict">Good move</span> Another was <move><san>Rh6+</san></move>',
      ),
    );
    expect(turn).toMatchObject({
      verdict: 'Good move',
      advice: 'Another was Rh6+',
      quality: 'goodMove',
    });
  });

  it('has no hint while the computer thinks', () => {
    const turn = readTurn(box('no-verdict', '<em>Computer thinking</em>', '', 'black'));
    expect(turn).toMatchObject({ color: 'black', status: 'Computer thinking', hint: '' });
  });

  it('is none once the box shows no instruction', () => {
    const over = box('no-verdict', '');
    over.querySelector('.instruction')?.remove();
    expect(readTurn(over)).toBeNull();
  });
});
