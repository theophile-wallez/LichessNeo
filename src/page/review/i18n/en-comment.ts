import type { Color, Piece } from '#shared/chess/index.ts';
import {
  agree,
  capitalize,
  definite,
  indefinite,
  pairOf,
  partyOf,
  type Party,
} from './en-grammar.ts';
import { betterMovesEn } from './en-better.ts';
import { capturesEn } from './en-captures.ts';
import { lineFactsEn } from './en-lines.ts';
import { pinsEn } from './en-pins.ts';
import { plansEn } from './en-plans.ts';
import type { FactSentences, Viewer, Ways } from './types.ts';

/** "You", "The opponent", "White": a side at the start of a sentence. */
const subject = (party: Party): string => capitalize(party.name);

// A mate given, let in, slowed down or missed.
type MateSentences = Pick<
  FactSentences,
  | 'checkmate'
  | 'matedIn'
  | 'heldOutLonger'
  | 'canForceMate'
  | 'matesNow'
  | 'mateFollows'
  | 'mateUnstoppable'
  | 'wouldForceMate'
  | 'mateInOne'
>;

// A mate in one, missed.
const inOne = (best: string): Ways => [
  `${best} was mate in one.`,
  `There was mate in one with ${best}.`,
  `${best} mated on the spot.`,
];

function matesEn(viewer: Viewer): MateSentences {
  return {
    checkmate: color => {
      const king =
        viewer === null ? `the ${color} king` : `${partyOf(viewer, color).possessive} king`;
      return [
        `Checkmate: ${king} has nowhere to go.`,
        `Mate! ${capitalize(king)} is caught.`,
        'Checkmate, and the game is over.',
      ];
    },
    matedIn: (best, moves) =>
      moves === 1
        ? inOne(best)
        : [
            `${best} mated in ${moves}.`,
            `${best} was mate in ${moves}.`,
            `A mate in ${moves} started with ${best}.`,
          ],
    heldOutLonger: best => [
      `${best} held out longer.`,
      `${best} would have delayed the mate.`,
      `With ${best}, the king would have lasted longer.`,
    ],
    canForceMate: (color, reply) => [
      `${subject(partyOf(viewer, color))} can now force mate, starting with ${reply}.`,
      `That allows a forced mate, beginning with ${reply}.`,
      `${reply} starts a forced mate now.`,
    ],
    matesNow: reply => [
      `That allows ${reply}, and it’s mate.`,
      `Now ${reply} mates on the spot.`,
      `Nothing stops ${reply}, and it’s mate.`,
    ],
    wouldForceMate: (best, moves) => [
      `${best} would have forced mate in ${moves}.`,
      `Mate in ${moves} was there, starting with ${best}.`,
      `${best} led to a forced mate in ${moves}.`,
    ],
    mateFollows: line => [`Mate follows by force: ${line}.`, `The mate is on its way: ${line}.`],
    mateUnstoppable: line => [
      `Nothing stops the mate now: ${line}.`,
      `Mate can no longer be avoided: ${line}.`,
    ],
    mateInOne: inOne,
  };
}

// What an error lets the opponent do: take a piece, fork, play a move.
type LossSentences = Pick<
  FactSentences,
  'leftUndefended' | 'answersAndWins' | 'allowsFork' | 'canPlay'
>;

function lossesEn(viewer: Viewer): LossSentences {
  const party = (color: Color): Party => partyOf(viewer, color);
  const the = (piece: Piece): string => definite(viewer, piece);
  return {
    leftUndefended: ({ piece, square, reply }) => [
      `${capitalize(the(piece))} on ${square} is left undefended: ${reply} wins it.`,
      `Nothing defends ${the(piece)} on ${square} anymore: ${reply} takes it.`,
      `${capitalize(the(piece))} on ${square} hangs, and ${reply} picks it up.`,
    ],
    answersAndWins: (color, { piece, square, reply }) => {
      const taker = party(color);
      return [
        `${subject(taker)} ${agree(taker, 'answers', 'answer')} ${reply} and ${agree(taker, 'wins', 'win')} ${the(piece)} on ${square}.`,
        `${reply} comes next, winning ${the(piece)} on ${square}.`,
        `After ${reply}, ${the(piece)} on ${square} is lost.`,
      ];
    },
    allowsFork: (reply, first, second) => [
      `That allows ${reply}, a fork of ${pairOf(viewer, first, second)}.`,
      `Now ${reply} forks ${pairOf(viewer, first, second)}.`,
      `That walks into ${reply}, forking ${pairOf(viewer, first, second)}.`,
    ],
    canPlay: (color, reply, why) =>
      why
        ? [
            `That lets ${party(color).name} play ${reply}, ${why}.`,
            `Now ${reply} comes, ${why}.`,
            `That allows ${reply}, ${why}.`,
          ]
        : [
            `That lets ${party(color).name} play ${reply}.`,
            `${reply} becomes possible.`,
            `Now ${party(color).name} can play ${reply}.`,
            `That opens the door to ${reply}.`,
          ],
  };
}

// What a good move does: the error it punishes, the sacrifice, the only move, the fork.
type GoodMoveSentences = Pick<
  FactSentences,
  'punishesAtOnce' | 'offered' | 'offeredFor' | 'keepsAdvantage' | 'holdsPosition' | 'forks'
>;

function goodMovesEn(viewer: Viewer): GoodMoveSentences {
  const party = (color: Color): Party => partyOf(viewer, color);
  const the = (piece: Piece): string => definite(viewer, piece);
  return {
    punishesAtOnce: color => {
      const whose = party(color).possessive;
      return [
        `${capitalize(whose)} mistake is punished right away.`,
        `That makes ${whose} mistake pay at once.`,
        `Straight to the point: ${whose} mistake doesn’t go unpunished.`,
        `No time wasted: ${whose} mistake is punished.`,
      ];
    },
    offered: (piece, color) => {
      const taker = party(color).name;
      return [
        `${capitalize(the(piece))} is offered, and ${taker} can’t safely take it.`,
        `${capitalize(the(piece))} is left hanging on purpose: taking it would cost ${taker} dearly.`,
        `A sacrifice: ${the(piece)} is there for the taking, but not for free.`,
      ];
    },
    offeredFor: (piece, taken, color) => {
      const taker = party(color).name;
      return [
        `${capitalize(the(piece))} goes for ${the(taken)} on purpose: taking it back would cost ${taker} dearly.`,
        `A sacrifice: ${the(piece)} for ${the(taken)}, and ${taker} can’t safely take it back.`,
      ];
    },
    keepsAdvantage: [
      'Every other move would have let the advantage slip.',
      'The only way to keep the advantage, and it was found.',
      'Anything else let the advantage go.',
      'The one move that kept the edge.',
    ],
    holdsPosition: color => {
      const holder = party(color).name;
      return [
        `Every other move would have left ${holder} worse off.`,
        `The only move that didn’t leave ${holder} worse off.`,
        `Anything else would have left ${holder} in trouble.`,
        `The one move that kept ${holder} out of trouble.`,
      ];
    },
    forks: (first, second) => [
      `A fork: ${pairOf(viewer, first, second)} are attacked at once.`,
      `A fork on ${pairOf(viewer, first, second)}.`,
      `Fork! ${capitalize(pairOf(viewer, first, second))} are hit together.`,
    ],
  };
}

// What a routine move does: castle, promote, check.
type RoutineSentences = Pick<FactSentences, 'castles' | 'promotes' | 'checkForces'>;

function routinesEn(viewer: Viewer): RoutineSentences {
  return {
    promotes: piece => [
      `The pawn promotes to ${indefinite(piece)}.`,
      `The pawn reaches the last rank and becomes ${indefinite(piece)}.`,
      `Promotion: the pawn turns into ${indefinite(piece)}.`,
    ],
    castles: [
      'The king is safe, and the rook joins the game.',
      'Castled: the king tucked away, the rook ready for action.',
      'The king goes to safety, and the rook comes into play.',
      'Castling: a safe king, and a rook ready to join in.',
    ],
    checkForces: color => {
      const checked = partyOf(viewer, color);
      return [
        `The check forces ${checked.name} to respond.`,
        `Check! ${subject(checked)} ${agree(checked, 'has', 'have')} to respond.`,
        `Check: ${checked.name} must answer first.`,
      ];
    },
  };
}

export const factsEn = (viewer: Viewer): FactSentences => ({
  ...matesEn(viewer),
  ...lossesEn(viewer),
  ...goodMovesEn(viewer),
  ...routinesEn(viewer),
  ...capturesEn(viewer),
  ...betterMovesEn(viewer),
  ...lineFactsEn(viewer),
  ...plansEn(viewer),
  ...pinsEn(viewer),
});
