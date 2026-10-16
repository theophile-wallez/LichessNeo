import { ROBOT_COACH } from '#shared/coach.ts';
import { bishop } from './bishop.ts';
import { boiledEgg } from './boiled-egg.ts';
import { bunny } from './bunny.ts';
import { cactus } from './cactus.ts';
import { cat } from './cat.ts';
import type { Character } from './character.ts';
import { ANIMALS } from './characters.ts';
import { cloud } from './cloud.ts';
import { dragon } from './dragon.ts';
import { ghost } from './ghost.ts';
import { king } from './king.ts';
import { knight } from './knight.ts';
import { mushroom } from './mushroom.ts';
import { queen } from './queen.ts';
import { rook } from './rook.ts';
import { slime } from './slime.ts';
import { snail } from './snail.ts';
import { soda } from './soda.ts';
import { star } from './star.ts';
import { toast } from './toast.ts';

// The Game Review's coaches: the seven animals (1 to 7, characters.ts), the computer's
// robot (8, robot.ts), then the coaches in other shapes than the egg (9 to 26), each in its
// own file.

/** Every coach but the robot, in the order of their numbers. */
export const CAST: readonly Character[] = [
  ...ANIMALS,
  mushroom,
  snail,
  ghost,
  cactus,
  toast,
  rook,
  knight,
  bishop,
  king,
  queen,
  bunny,
  cat,
  dragon,
  boiledEgg,
  soda,
  cloud,
  slime,
  star,
];

/** The coach of number `coach`, the robot's aside: the ones after it come one place earlier. */
export function coachCharacter(coach: number): Character {
  const index = coach > ROBOT_COACH ? coach - 2 : coach - 1;
  const character = CAST[index] ?? CAST[0];
  if (!character) throw new Error('the cast is empty');
  return character;
}
