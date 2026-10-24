import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  chooseHomeCoach,
  COACH_COUNT,
  coachOptions,
  homeCoach,
  homeCoachChoice,
  keepCoachOptions,
  coachOf,
  coachPick,
  NO_COACH,
  OFFERED_COACHES,
  RANDOM_COACH,
  ROBOT_COACH,
  shownCoach,
  speakingCoach,
} from './coach.ts';

// Held back while it's reworked.
const KNIGHT = 15;

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.lnExtCoach;
});

describe('coachPick', () => {
  it('keeps the stored coach, the robot too', () => {
    localStorage.setItem('ln-ext-coach', String(ROBOT_COACH));
    expect(coachPick()).toBe(ROBOT_COACH);
  });

  it('keeps a stored coach of the other shapes, past the robot', () => {
    localStorage.setItem('ln-ext-coach', String(COACH_COUNT));
    expect(coachPick()).toBe(COACH_COUNT);
  });

  it('keeps the stored coach', () => {
    localStorage.setItem('ln-ext-coach', '4');
    const random = vi.spyOn(Math, 'random');
    expect(coachPick()).toBe(4);
    expect(random).not.toHaveBeenCalled();
    expect(localStorage.getItem('ln-ext-coach')).toBe('4');
  });

  it('is one at random on each page until one is picked, and keeps nothing', () => {
    expect(coachPick()).toBe(RANDOM_COACH);
    expect(localStorage.getItem('ln-ext-coach')).toBeNull();
  });

  it.each(['0', '27', 'x', ''])('is one at random over a stored "%s", left as it was', stored => {
    localStorage.setItem('ln-ext-coach', stored);
    expect(coachPick()).toBe(RANDOM_COACH);
    expect(localStorage.getItem('ln-ext-coach')).toBe(stored);
  });

  it('is one at random for a coach that isn’t a whole number (the original kept "2.5")', () => {
    localStorage.setItem('ln-ext-coach', '2.5');
    expect(coachPick()).toBe(RANDOM_COACH);
  });

  it('is one at random for a coach held back, the knight', () => {
    localStorage.setItem('ln-ext-coach', String(KNIGHT));
    expect(coachPick()).toBe(RANDOM_COACH);
  });
});

describe('the coaches offered', () => {
  it('are every coach in order but the knight, held back', () => {
    expect(OFFERED_COACHES).toHaveLength(COACH_COUNT - 1);
    expect(OFFERED_COACHES).not.toContain(KNIGHT);
    expect(OFFERED_COACHES).toEqual(
      [...OFFERED_COACHES].toSorted((first, second) => first - second),
    );
    expect(OFFERED_COACHES).toContain(ROBOT_COACH);
    expect(OFFERED_COACHES.at(-1)).toBe(COACH_COUNT);
  });
});

describe('no coach, or one at random', () => {
  it.each([NO_COACH, RANDOM_COACH])('keeps the stored "%s"', pick => {
    localStorage.setItem('ln-ext-coach', pick);
    expect(coachPick()).toBe(pick);
  });

  it('shows no coach for none', () => {
    expect(coachOf(NO_COACH)).toBeNull();
  });

  it('draws a coach from when the page started, the same each time on a page', () => {
    vi.spyOn(performance, 'timeOrigin', 'get').mockReturnValue(1_000_000.7);
    expect(coachOf(RANDOM_COACH)).toBe(1);
    expect(coachOf(RANDOM_COACH)).toBe(coachOf(RANDOM_COACH));
    vi.spyOn(performance, 'timeOrigin', 'get').mockReturnValue(1_000_001);
    expect(coachOf(RANDOM_COACH)).toBe(2);
  });

  it('draws every coach offered, and never the knight', () => {
    const drawn = new Set<number | null>();
    for (let i = 0; i < COACH_COUNT * 2; i++) {
      vi.spyOn(performance, 'timeOrigin', 'get').mockReturnValue(i);
      drawn.add(coachOf(RANDOM_COACH));
    }
    expect(OFFERED_COACHES.filter(coach => drawn.has(coach))).toEqual(OFFERED_COACHES);
    expect(drawn.size).toBe(OFFERED_COACHES.length);
  });

  it('shows the coach <html> carries, whatever the pick', () => {
    localStorage.setItem('ln-ext-coach', '4');
    document.documentElement.dataset.lnExtCoach = '9';
    expect(shownCoach()).toBe(9);
    document.documentElement.dataset.lnExtCoach = NO_COACH;
    expect(shownCoach()).toBeNull();
  });

  it('falls back on the pick before <html> carries one', () => {
    localStorage.setItem('ln-ext-coach', NO_COACH);
    expect(shownCoach()).toBeNull();
    localStorage.setItem('ln-ext-coach', '4');
    expect(shownCoach()).toBe(4);
  });

  it('words what it says as the first coach with none', () => {
    document.documentElement.dataset.lnExtCoach = NO_COACH;
    expect(speakingCoach()).toBe(1);
    document.documentElement.dataset.lnExtCoach = '6';
    expect(speakingCoach()).toBe(6);
  });
});

describe('the home’s coach', () => {
  it('has none when the coach it follows is none', () => {
    localStorage.setItem('ln-ext-coach', NO_COACH);
    expect(homeCoach()).toBeNull();
  });

  it('has none of its own while the pages show one', () => {
    localStorage.setItem('ln-ext-coach', '4');
    chooseHomeCoach(NO_COACH);
    expect(homeCoachChoice()).toBe(NO_COACH);
    expect(homeCoach()).toBeNull();
  });

  it('follows the coach until the home is given one', () => {
    localStorage.setItem('ln-ext-coach', '4');
    expect(homeCoachChoice()).toBeNull();
    expect(homeCoach()).toBe(4);
  });

  it('is the home’s own once picked, whatever the coach', () => {
    localStorage.setItem('ln-ext-coach', '4');
    chooseHomeCoach(ROBOT_COACH);
    expect(localStorage.getItem('ln-ext-home-coach')).toBe(String(ROBOT_COACH));
    expect(homeCoachChoice()).toBe(ROBOT_COACH);
    expect(homeCoach()).toBe(ROBOT_COACH);
  });

  it('follows the coach again once the pick is dropped', () => {
    localStorage.setItem('ln-ext-coach', '4');
    chooseHomeCoach(COACH_COUNT);
    chooseHomeCoach(null);
    expect(localStorage.getItem('ln-ext-home-coach')).toBeNull();
    expect(homeCoach()).toBe(4);
  });

  it.each(['0', '27', 'x', '2.5', ''])('follows the coach over a stored "%s"', stored => {
    localStorage.setItem('ln-ext-coach', '4');
    localStorage.setItem('ln-ext-home-coach', stored);
    expect(homeCoachChoice()).toBeNull();
    expect(homeCoach()).toBe(4);
  });

  it('follows one at random on each page when none is picked', () => {
    vi.spyOn(performance, 'timeOrigin', 'get').mockReturnValue(2);
    expect(homeCoach()).toBe(3);
    expect(localStorage.getItem('ln-ext-coach')).toBeNull();
  });

  it('takes its own coach held back, the knight, for one at random', () => {
    localStorage.setItem('ln-ext-home-coach', String(KNIGHT));
    expect(homeCoachChoice()).toBe(RANDOM_COACH);
  });
});

describe('coachOptions', () => {
  it('is all on until the settings have been kept', () => {
    expect(coachOptions()).toEqual({ motion: true, analysis: true, board: true });
  });

  it('reads back the switches kept', () => {
    keepCoachOptions({ motion: false, analysis: true, board: false });
    expect(coachOptions()).toEqual({ motion: false, analysis: true, board: false });
  });

  it('keeps the drawings on, kept before they had a switch', () => {
    localStorage.setItem('ln-ext-coach-options', '{"motion":false,"analysis":true}');
    expect(coachOptions()).toEqual({ motion: false, analysis: true, board: true });
  });

  it('is all on over a stored value of another shape', () => {
    localStorage.setItem('ln-ext-coach-options', '{"motion":"no"}');
    expect(coachOptions()).toEqual({ motion: true, analysis: true, board: true });
  });
});
