import { describe, expect, it } from 'vitest';
import {
  COACH_COUNT,
  COACH_MOODS,
  type CoachMood,
  ROBOT_COACH,
  ROBOT_COACH_LEVEL,
} from '#shared/coach.ts';
import { meshesIn } from '#shared/testing/meshes.ts';
import { createFurLook } from '#content/coach/mascot/fur/fur.ts';
import { Mascot } from '#content/coach/mascot/rig/rig.ts';
import { CAST, coachCharacter } from './cast.ts';
import type { Character } from './character.ts';
import { robotFor } from './robot.ts';

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
    expect(coachCharacter(14).name).toBe('Tour');
    expect(coachCharacter(15).name).toBe('Cavalier');
    expect(coachCharacter(COACH_COUNT).name).toBe('Étoile');
  });

  it('falls back on the first coach for a number it doesn’t know', () => {
    expect(coachCharacter(COACH_COUNT + 1)).toBe(CAST[0]);
  });
});

/** The meshes of `mascot` drawn somewhere other than at finite numbers. */
function broken(mascot: Mascot): string[] {
  mascot.root.updateMatrixWorld(true);
  return meshesIn(mascot.root)
    .filter(({ mesh, geometry }) => {
      const points = geometry.getAttribute('position')?.array ?? [];
      const finite = mesh.matrixWorld.elements.every(Number.isFinite);
      return mesh.visible && !(finite && Array.from(points).every(Number.isFinite));
    })
    .map(({ mesh }) => mesh.name || mesh.type);
}

const cast = (character: Character): Mascot =>
  new Mascot(character, createFurLook(character.colors, character.frontMask, character.stripes));

/** Plays each of `moods` on a new `character` in turn, and says where it broke. */
function play(
  character: Character,
  moods: readonly CoachMood[],
): { mood: CoachMood; broken: string[] }[] {
  const mascot = cast(character);
  mascot.waveHello();
  const played = moods.map(mood => {
    mascot.setMood(mood);
    for (let frame = 0; frame < 45; frame++) mascot.update(1 / 30);
    return { mood, broken: broken(mascot) };
  });
  mascot.dispose();
  return played;
}

// Each case builds a whole mascot twice, its skin and face shaped and sampled
// as on the page, and plays 1,080 frames: up to 3.5 s alone, far more on CI.
describe('every coach', { timeout: 30_000 }, () => {
  it.each(
    [...CAST, robotFor(ROBOT_COACH_LEVEL)].map(character => [character.name, character] as const),
  )('%s takes every mood, every point of it where it should be', (_, character) => {
    // Both ways round: each mood after the others, and before them.
    for (const moods of [COACH_MOODS, COACH_MOODS.toReversed()])
      expect(play(character, moods)).toEqual(moods.map(mood => ({ mood, broken: [] })));
  });
});
