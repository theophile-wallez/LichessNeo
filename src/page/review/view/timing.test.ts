import { afterEach, expect, it } from 'vitest';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import { timingAt } from './timing.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
});

it('takes a move’s increment off the clock it left, for the clock before it', () => {
  const { session, ctrl, facade } = judgedGame('opera');
  // 3+2: every move takes 5 s, and each clock then reads a minute.
  const game = ctrl.data['game'];
  if (typeof game === 'object' && game)
    Reflect.set(
      game,
      'moveCentis',
      ctrl.mainline.map(() => 500),
    );
  for (const node of ctrl.mainline.slice(1)) Reflect.set(node, 'clock', 6000);
  ctrl.data['clock'] = { initial: 180, increment: 2 };
  expect(timingAt(facade, session.work, 3)).toMatchObject({ spent: 5, clock: 63, initial: 63 });
  ctrl.data['clock'] = { initial: 180, increment: 0 };
  expect(timingAt(facade, session.work, 3)).toMatchObject({ clock: 65 });
});
