import { afterEach, describe, expect, it } from 'vitest';
import { keepCoachOptions } from '#shared/coach.ts';
import { reviewDrawing, setReviewDrawing } from '#page/board/review-arrows.ts';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import { renderBoard } from './board.ts';

afterEach(() => {
  setReviewDrawing([]);
  Reflect.deleteProperty(window, 'site');
  localStorage.clear();
  document.documentElement.className = '';
});

const RING = { kind: 'ring', square: 'e4', tone: 'plan' } as const;

/** The opera game on its 25th move, the coach's drawing of it made. */
function drawnOn() {
  const { session, ctrl, facade } = judgedGame('opera');
  ctrl.jumpToMain(25);
  session.view.mode = 'moves';
  session.view.drawing = { path: facade.path, marks: [RING] };
  return { session, ctrl, facade };
}

describe('the coach’s drawing on the board', () => {
  it('shows while its move is on the board', () => {
    const { session, ctrl, facade } = drawnOn();
    renderBoard(session, facade);
    expect(reviewDrawing()).toEqual([RING]);
    ctrl.jumpToMain(26);
    renderBoard(session, facade);
    expect(reviewDrawing()).toEqual([]);
  });

  it('stays off while the settings keep the coach’s drawings off', () => {
    keepCoachOptions({ motion: true, analysis: true, board: false });
    const { session, facade } = drawnOn();
    renderBoard(session, facade);
    expect(reviewDrawing()).toEqual([]);
  });
});
