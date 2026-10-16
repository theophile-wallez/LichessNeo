import { z } from 'zod/mini';
import { COACH_COUNT, ROBOT_COACH, ROBOT_TIERS } from '#shared/coach.ts';
import type { Character } from '#content/coach/mascot/cast/character.ts';
import { coachCharacter } from '#content/coach/mascot/cast/cast.ts';
import { FINISHES } from '#content/coach/mascot/cast/finishes.ts';
import { robotFor } from '#content/coach/mascot/cast/robot.ts';

// Who can step on the playground's stage: the coaches by their numbers and the
// robot in each of its colors, and what the panel may change about them.

export interface Actor {
  readonly id: string;
  readonly label: string;
  readonly character: Character;
}

const LEVEL_NAMES = ['vert', 'bleu', 'violet', 'rouge'];

export const ACTORS: readonly Actor[] = [
  ...Array.from({ length: COACH_COUNT }, (_, i) => i + 1)
    .filter(coach => coach !== ROBOT_COACH)
    .map(coach => {
      const character = coachCharacter(coach);
      return { id: `coach-${coach}`, label: `${coach}. ${character.name}`, character };
    }),
  ...Array.from({ length: ROBOT_TIERS }, (_, i) => ({
    id: `robot-${i + 1}`,
    label: `Robot ${LEVEL_NAMES[i] ?? i + 1} (niveaux ${2 * i + 1}–${2 * i + 2})`,
    character: robotFor(2 * i + 1),
  })),
];

export function actorById(id: string): Actor {
  const actor = ACTORS.find(candidate => candidate.id === id) ?? ACTORS[0];
  if (!actor) throw new Error('the cast is empty');
  return actor;
}

export const HexSchema = z.string().check(z.regex(/^#[\da-f]{6}$/i));

/** What the panel changes about a character; what it leaves out stays as the character has it. */
export const EditsSchema = z.object({
  colors: z.optional(
    z.object({
      coat: z.optional(HexSchema),
      front: z.optional(HexSchema),
      accent: z.optional(HexSchema),
      light: z.optional(HexSchema),
    }),
  ),
  frontMask: z.optional(z.tuple([z.number(), z.number()])),
  brows: z.optional(HexSchema),
  skin: z.optional(z.enum(['fur', ...FINISHES])),
});
export type Edits = z.infer<typeof EditsSchema>;

function editedLook(character: Character, edits: Edits): Character {
  const { colors } = character;
  // A robot's lights need a solid skin: one with lights never takes fur.
  const furless = edits.skin === 'fur' && colors.light !== undefined;
  const skin = furless ? character.skin : (edits.skin ?? character.skin);
  const light = edits.colors?.light ?? colors.light;
  return {
    ...character,
    skin,
    colors: {
      coat: edits.colors?.coat ?? colors.coat,
      front: edits.colors?.front ?? colors.front,
      accent: edits.colors?.accent ?? colors.accent,
      ...(light === undefined ? {} : { light }),
    },
    frontMask: edits.frontMask ?? character.frontMask,
    face: {
      ...character.face,
      brows: { ...character.face.brows, color: edits.brows ?? character.face.brows.color },
    },
  };
}

/** The character with `edits` applied, both ways it may look. */
export function edited(character: Character, edits: Edits): Character {
  const one = editedLook(character, edits);
  const { facingLeft } = character;
  return facingLeft ? { ...one, facingLeft: editedLook(facingLeft, edits) } : one;
}

const round = (value: number): number => Math.round(value * 100) / 100;

/** The edited lines, as characters.ts writes them, to paste back there. */
export function asSource(character: Character): string {
  const { coat, front, accent, light } = character.colors;
  const lightLine = light === undefined ? '' : `, light: '${light}'`;
  const [bottom, top] = character.frontMask;
  return [
    `skin: '${character.skin}',`,
    `colors: { coat: '${coat}', front: '${front}', accent: '${accent}'${lightLine} },`,
    `frontMask: [${round(bottom)}, ${round(top)}],`,
    `brows: { y: ${character.face.brows.y}, color: '${character.face.brows.color}' },`,
  ].join('\n');
}
