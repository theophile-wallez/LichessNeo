import { afterEach, describe, expect, it, vi } from 'vitest';
import { COACH_COUNT, pickCoach, ROBOT_COACH } from './coach.ts';

afterEach(() => localStorage.clear());

describe('pickCoach', () => {
  it('keeps the stored coach, the robot too', () => {
    localStorage.setItem('lr-ext-coach', String(ROBOT_COACH));
    expect(pickCoach()).toBe(ROBOT_COACH);
  });

  it('keeps a stored coach of the other shapes, past the robot', () => {
    localStorage.setItem('lr-ext-coach', String(COACH_COUNT));
    expect(pickCoach()).toBe(COACH_COUNT);
  });

  it('keeps the stored coach', () => {
    localStorage.setItem('lr-ext-coach', '4');
    const random = vi.spyOn(Math, 'random');
    expect(pickCoach()).toBe(4);
    expect(random).not.toHaveBeenCalled();
    expect(localStorage.getItem('lr-ext-coach')).toBe('4');
  });

  it('picks one at random the first time, and keeps it', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.15);
    expect(pickCoach()).toBe(4);
    expect(localStorage.getItem('lr-ext-coach')).toBe('4');
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    expect(pickCoach()).toBe(4);
  });

  it.each(['0', '27', 'x', ''])('picks again over a stored "%s"', stored => {
    localStorage.setItem('lr-ext-coach', stored);
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(pickCoach()).toBe(COACH_COUNT);
    expect(localStorage.getItem('lr-ext-coach')).toBe(String(COACH_COUNT));
  });

  it('picks again for a coach that isn’t a whole number (the original kept "2.5")', () => {
    localStorage.setItem('lr-ext-coach', '2.5');
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    expect(pickCoach()).toBe(3);
    expect(localStorage.getItem('lr-ext-coach')).toBe('3');
  });
});
