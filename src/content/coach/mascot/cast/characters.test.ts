import { describe, expect, it } from 'vitest';
import { COACH_COUNT, ROBOT_COACH } from '#shared/coach.ts';
import { CAST, coachCharacter } from './characters.ts';

describe('coachCharacter', () => {
  it('casts every coach but the robot, each once', () => {
    const numbers = Array.from({ length: COACH_COUNT }, (_, i) => i + 1).filter(
      coach => coach !== ROBOT_COACH,
    );
    expect(new Set(numbers.map(coachCharacter)).size).toBe(CAST.length);
    expect(numbers.length).toBe(CAST.length);
  });

  it('gives the animals their numbers, and the other shapes theirs past the robot', () => {
    expect(coachCharacter(1).name).toBe('Pion');
    expect(coachCharacter(ROBOT_COACH - 1).name).toBe('Poulpe');
    expect(coachCharacter(ROBOT_COACH + 1).name).toBe('Champignon');
    expect(coachCharacter(COACH_COUNT).name).toBe('Tour');
  });

  it('falls back on the first coach for a number it doesn’t know', () => {
    expect(coachCharacter(COACH_COUNT + 1)).toBe(CAST[0]);
  });
});
