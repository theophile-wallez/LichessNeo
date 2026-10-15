import { afterEach, describe, expect, it } from 'vitest';
import { pickCoach, ROBOT_COACH } from '#shared/coach.ts';
import { newSession } from '#page/review/fixtures/unit-review.ts';
import { nextCoach } from './coach-avatar.ts';

afterEach(() => {
  localStorage.clear();
});

describe('nextCoach', () => {
  it('goes on to the robot after the animals, then back to the first, kept for every page', () => {
    const session = newSession();
    const avatar = document.createElement('button');
    session.coach.id = ROBOT_COACH - 1;
    nextCoach(session, avatar);
    expect([session.coach.id, avatar.dataset.lrExtCoachId, pickCoach()]).toEqual([
      ROBOT_COACH,
      String(ROBOT_COACH),
      ROBOT_COACH,
    ]);
    nextCoach(session, avatar);
    expect([session.coach.id, avatar.dataset.lrExtCoachId, pickCoach()]).toEqual([1, '1', 1]);
  });
});
