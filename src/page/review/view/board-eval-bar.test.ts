import { afterEach, expect, it } from 'vitest';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import { renderBoard } from './board.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
  document.documentElement.className = '';
});

const barShown = (): boolean => document.documentElement.classList.contains('ln-ext-evalbar-on');

it('shows the eval bar while the review is open', () => {
  const { session, ctrl, facade } = judgedGame('opera');
  ctrl.jumpToMain(10);
  session.view.mode = 'moves';
  renderBoard(session, facade);
  expect(barShown()).toBe(true);
});

it('hides the eval bar while the analysis settings hide the gauge', () => {
  const { session, ctrl, facade } = judgedGame('opera');
  ctrl.jumpToMain(10);
  session.view.mode = 'moves';
  Object.assign(ctrl, { settings: { showGauge: false } });
  renderBoard(session, facade);
  expect(barShown()).toBe(false);
  Object.assign(ctrl, { settings: { showGauge: true } });
  renderBoard(session, facade);
  expect(barShown()).toBe(true);
});
