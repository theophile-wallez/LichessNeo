import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  chooseHomeCoach,
  COACH_COUNT,
  coachOptions,
  homeCoach,
  homeCoachChoice,
  keepCoachOptions,
  pickCoach,
  ROBOT_COACH,
} from './coach.ts';

afterEach(() => localStorage.clear());

describe('pickCoach', () => {
  it('keeps the stored coach, the robot too', () => {
    localStorage.setItem('ln-ext-coach', String(ROBOT_COACH));
    expect(pickCoach()).toBe(ROBOT_COACH);
  });

  it('keeps a stored coach of the other shapes, past the robot', () => {
    localStorage.setItem('ln-ext-coach', String(COACH_COUNT));
    expect(pickCoach()).toBe(COACH_COUNT);
  });

  it('keeps the stored coach', () => {
    localStorage.setItem('ln-ext-coach', '4');
    const random = vi.spyOn(Math, 'random');
    expect(pickCoach()).toBe(4);
    expect(random).not.toHaveBeenCalled();
    expect(localStorage.getItem('ln-ext-coach')).toBe('4');
  });

  it('picks one at random the first time, and keeps it', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.15);
    expect(pickCoach()).toBe(4);
    expect(localStorage.getItem('ln-ext-coach')).toBe('4');
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    expect(pickCoach()).toBe(4);
  });

  it.each(['0', '27', 'x', ''])('picks again over a stored "%s"', stored => {
    localStorage.setItem('ln-ext-coach', stored);
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(pickCoach()).toBe(COACH_COUNT);
    expect(localStorage.getItem('ln-ext-coach')).toBe(String(COACH_COUNT));
  });

  it('picks again for a coach that isn’t a whole number (the original kept "2.5")', () => {
    localStorage.setItem('ln-ext-coach', '2.5');
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    expect(pickCoach()).toBe(3);
    expect(localStorage.getItem('ln-ext-coach')).toBe('3');
  });
});

describe('the home’s coach', () => {
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

  it('picks a coach to follow, and keeps it, when there’s none yet', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.15);
    expect(homeCoach()).toBe(4);
    expect(localStorage.getItem('ln-ext-coach')).toBe('4');
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
