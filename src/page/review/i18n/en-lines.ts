import type { Color, Piece } from '#shared/chess/index.ts';
import {
  agree,
  capitalize,
  definite,
  materialEn,
  partyOf,
  type Party,
  soon,
  within,
} from './en-grammar.ts';
import { motifEn } from './en-motifs.ts';
import type { LineFacts, Viewer } from './types.ts';

// The sentences read off the engine's lines: what a line wins, and the threats.

type GainSentences = Pick<LineFacts, 'forcesMate' | 'losesMaterial' | 'wouldHaveWon' | 'winsAlong'>;

function gainsEn(viewer: Viewer): GainSentences {
  const party = (color: Color): Party => partyOf(viewer, color);
  return {
    forcesMate: (color, line) => [
      `${capitalize(party(color).name)} can now force mate: ${line}.`,
      `A forced mate is on: ${line}.`,
      `Mate is coming by force: ${line}.`,
    ],
    losesMaterial: (color, { material, line, moves }, threatened) => {
      const winner = party(color);
      const wins = `${winner.name} ${agree(winner, 'wins', 'win')} ${material} ${within(moves)}`;
      if (threatened)
        return [
          `The threat is still there, and ${wins}: ${line}.`,
          `That leaves the threat on, and ${wins}: ${line}.`,
        ];
      return [
        `${capitalize(wins)}: ${line}.`,
        `${line}: ${wins}.`,
        `That costs ${material} ${within(moves)}: ${line}.`,
        `${line} picks up ${material}.`,
      ];
    },
    wouldHaveWon: (color, { material, line, moves }) => [
      `Better was to win ${material} ${soon(moves)}: ${line}.`,
      `${capitalize(party(color).name)} could have won ${material} ${soon(moves)}: ${line}.`,
      `${capitalize(material)} was there for the taking ${soon(moves)}: ${line}.`,
      `There was ${material} to win ${soon(moves)}: ${line}.`,
    ],
    winsAlong: ({ material, line, moves }) => [
      `This wins ${material} ${soon(moves)}: ${line}.`,
      `${capitalize(material)} won ${soon(moves)}: ${line}.`,
      `That nets ${material} ${soon(moves)}: ${line}.`,
      `${capitalize(material)} in the bag ${soon(moves)}: ${line}.`,
    ],
  };
}

type ThreatSentences = Pick<
  LineFacts,
  'stopsThreat' | 'stopsMate' | 'stopsLongMate' | 'escapes' | 'threatens' | 'threatensMate'
>;

function threatsEn(viewer: Viewer): ThreatSentences {
  const the = (piece: Piece): string => capitalize(definite(viewer, piece));
  return {
    stopsThreat: (threat, material) => [
      `That stops ${threat}, which would have won ${material}.`,
      `No more ${threat}, which would have won ${material}.`,
      `${threat} is off the table now: it would have won ${material}.`,
      `Well defended: ${threat} would have won ${material}.`,
    ],
    stopsMate: line => [
      `The mate is stopped: ${line}.`,
      `That parries the mating threat: ${line}.`,
      `Mate was coming, and that stops it: ${line}.`,
    ],
    stopsLongMate: (moves, first) => [
      `That stops a mate in ${moves}, starting with ${first}.`,
      `That parries a mate in ${moves}, which began with ${first}.`,
      `A mate in ${moves} was coming, starting with ${first}: no longer.`,
    ],
    escapes: (piece, threat) => [
      `${the(piece)} gets out of the way of ${threat}.`,
      `${the(piece)} steps out of reach of ${threat}.`,
      `${the(piece)} dodges ${threat}.`,
      `${the(piece)} escapes ${threat} just in time.`,
    ],
    threatens: (threat, material) => [
      `The threat is ${threat} on the next move, winning ${material}.`,
      `Now ${threat} is threatened, winning ${material}.`,
      `Next comes ${threat}, winning ${material}.`,
      `${threat} is in the air, and would win ${material}.`,
    ],
    threatensMate: (threat, moves) =>
      moves <= 1
        ? [
            `Mate is threatened on the next move: ${threat}.`,
            `${threat} would be mate next.`,
            `A mate in one is threatened: ${threat}.`,
          ]
        : [
            `Mate is threatened ${within(moves)}, starting with ${threat}.`,
            `A mate ${within(moves)} is in the air, starting with ${threat}.`,
            `The attack threatens mate ${within(moves)}, with ${threat} first.`,
          ],
  };
}

export const lineFactsEn = (viewer: Viewer): LineFacts => ({
  motif: motifEn(viewer),
  material: materialEn,
  ...gainsEn(viewer),
  ...threatsEn(viewer),
});
