import type { Color } from '#shared/chess/index.ts';
import { agree, capitalize, partyOf, type Party } from './en-grammar.ts';
import type { TrajectorySentences, Viewer } from './types.ts';

// How a move changed the game: "The balance tips: now the opponent has a clear advantage."

/** "You", "The opponent", "White": a side at the start of a sentence. */
const subject = (party: Party): string => capitalize(party.name);

/** "you have a clear advantage", "the opponent has a slight edge". */
const holds = (party: Party, advantage: string): string =>
  `${party.name} ${agree(party, 'has', 'have')} ${advantage}`;

type Changes = Pick<
  TrajectorySentences,
  'wasBalanced' | 'nowBalanced' | 'grows' | 'shrinks' | 'swings'
>;

// The sentences for an advantage that changes.
function changesEn(viewer: Viewer): Changes {
  const party = (color: Color): Party => partyOf(viewer, color);
  return {
    wasBalanced: (after, forMover) => {
      const has = holds(party(after.side), after.advantage);
      return [
        `The game was balanced, ${forMover ? 'and' : 'but'} now ${has}.`,
        `The balance tips: now ${has}.`,
        `No longer level: ${has}.`,
        `The scales tip, and ${has}.`,
      ];
    },
    nowBalanced: before => [
      `${subject(party(before.side))} had ${before.advantage}, but the game is now balanced.`,
      'The game is level again.',
      'Back to equal.',
      'Equality is restored.',
    ],
    grows: (color, from, to) => {
      const ahead = party(color);
      return [
        `${subject(ahead)} ${agree(ahead, 'goes', 'go')} from ${from} to ${to}.`,
        `The gap widens: now ${holds(ahead, to)}.`,
        `${capitalize(ahead.possessive)} lead grows: ${to} now.`,
        `Even better for ${ahead.name}: ${to}.`,
      ];
    },
    shrinks: (color, from, to) => {
      const ahead = party(color);
      return [
        `${subject(ahead)} had ${from}; now it’s only ${to}.`,
        `${capitalize(ahead.possessive)} lead shrinks to ${to}.`,
        `${capitalize(ahead.possessive)} lead slips: only ${to} left.`,
        `Down from ${from} to ${to} for ${ahead.name}.`,
      ];
    },
    swings: (before, after) => {
      const has = holds(party(after.side), after.advantage);
      return [
        `${subject(party(before.side))} had ${before.advantage}, but now ${has}.`,
        `The tables turn: now ${has}.`,
        `A complete turnaround: now ${has}.`,
        `Everything changes: now ${has}.`,
      ];
    },
  };
}

export function trajectoryEn(viewer: Viewer): TrajectorySentences {
  const party = (color: Color): Party => partyOf(viewer, color);
  return {
    ...changesEn(viewer),
    advantages: ['', 'a slight edge', 'a clear advantage', 'a winning position', 'a forced mate'],
    mateIn: moves => (moves === 1 ? 'a mate in one' : `a mate in ${moves}`),
    mates: (side, moves) => {
      const ahead = party(side);
      const mate = moves === null ? 'a forced mate' : `mate in ${moves === 1 ? 'one' : moves}`;
      return [
        `Now ${holds(ahead, mate)}.`,
        `It’s more than an edge now: ${holds(ahead, mate)}.`,
        `The game is decided: ${holds(ahead, mate)}.`,
      ];
    },
    stillBalanced: [
      'The game stays balanced.',
      'The balance holds.',
      'Still level.',
      'Nobody is ahead yet.',
      'The chances stay equal.',
    ],
    stillAhead: ({ side, advantage }) => {
      const ahead = party(side);
      return [
        `${subject(ahead)} still ${agree(ahead, 'has', 'have')} ${advantage}.`,
        `${subject(ahead)} ${agree(ahead, 'keeps', 'keep')} ${advantage}.`,
        `Nothing changes: ${holds(ahead, advantage)}.`,
      ];
    },
    turningPoint: [
      'This is where the game turned.',
      'The turning point of the game.',
      'The game was decided here.',
      'The key moment of the game.',
    ],
  };
}
