import type { Color, Piece } from '#shared/chess/index.ts';
import {
  agree,
  capitalize,
  definite,
  indefinite,
  materialEn,
  partyOf,
  type Party,
  soon,
  within,
} from './en-grammar.ts';
import { motifEn } from './en-motifs.ts';
import { plansEn } from './en-plans.ts';
import type { FactSentences, LineFacts, TrajectorySentences, Viewer } from './types.ts';

/** "You", "The opponent", "White": a side at the start of a sentence. */
const subject = (party: Party): string => capitalize(party.name);

export function trajectoryEn(viewer: Viewer): TrajectorySentences {
  const party = (color: Color, ...seed: readonly string[]): Party =>
    partyOf(viewer, color, seed.join('|'));
  return {
    advantages: ['', 'a slight edge', 'a clear advantage', 'a winning position', 'a forced mate'],
    mateIn: moves => `a mate in ${moves}`,
    stillBalanced: ['The game stays balanced.', 'It’s still an even game.', 'The balance holds.'],
    stillAhead: ({ side, advantage }) => {
      const ahead = party(side, advantage);
      return [
        `${subject(ahead)} still ${agree(ahead, 'has', 'have')} ${advantage}.`,
        `${subject(ahead)} ${agree(ahead, 'keeps', 'keep')} ${advantage}.`,
      ];
    },
    wasBalanced: (after, forMover) => {
      const ahead = party(after.side, 'balanced', after.advantage);
      const has = `${ahead.name} ${agree(ahead, 'has', 'have')} ${after.advantage}`;
      return [
        `The game was balanced, ${forMover ? 'and' : 'but'} now ${has}.`,
        `The balance tips: now ${has}.`,
      ];
    },
    nowBalanced: before => [
      `${subject(party(before.side, 'now', before.advantage))} had ${before.advantage}, but the game is now balanced.`,
      'The game is level again.',
    ],
    grows: (color, from, to) => {
      const ahead = party(color, from, to);
      return [
        `${subject(ahead)} ${agree(ahead, 'goes', 'go')} from ${from} to ${to}.`,
        `${subject(ahead)} ${agree(ahead, 'pulls', 'pull')} further ahead: now ${ahead.name} ${agree(ahead, 'has', 'have')} ${to}.`,
      ];
    },
    shrinks: (color, from, to) => {
      const ahead = party(color, to, from);
      return [
        `${subject(ahead)} had ${from}; now it’s only ${to}.`,
        `${capitalize(ahead.possessive)} advantage shrinks to ${to}.`,
      ];
    },
    swings: (before, after) => {
      const ahead = party(after.side, 'swings', after.advantage);
      const has = `${ahead.name} ${agree(ahead, 'has', 'have')} ${after.advantage}`;
      return [
        `${subject(party(before.side, 'swung', before.advantage))} had ${before.advantage}, but now ${has}.`,
        `The tables turn: now ${has}.`,
      ];
    },
  };
}

// The pieces a fork hits: "the [rook] and the [queen]", or whose they are.
const both = (viewer: Viewer, first: Piece, second: Piece): string =>
  `${definite(viewer, first)} and ${definite(viewer, second)}`;

// The sentences read off the engine's lines.
function lineFactsEn(viewer: Viewer): LineFacts {
  const party = (color: Color, ...seed: readonly string[]): Party =>
    partyOf(viewer, color, seed.join('|'));
  const the = (piece: Piece): string => definite(viewer, piece);
  return {
    motif: motifEn(viewer),
    material: materialEn,
    forcesMate: (color, line) => `${subject(party(color, line))} can now force mate: ${line}.`,
    losesMaterial: (color, { material, line, moves }, threatened) => {
      const winner = party(color, material, line);
      const wins = `${winner.name} ${agree(winner, 'wins', 'win')} ${material} ${within(moves)}`;
      if (threatened) return [`The threat is still there, and ${wins}: ${line}.`];
      return [`${capitalize(wins)}: ${line}.`, `${line}: ${wins}.`];
    },
    wouldHaveWon: (color, { material, line, moves }) => {
      const mover = party(color, 'won', line);
      return [
        `Better was to win ${material} ${soon(moves)}: ${line}.`,
        `${subject(mover)} could have won ${material} ${soon(moves)}: ${line}.`,
      ];
    },
    winsAlong: ({ material, line, moves }) => [
      `This wins ${material} ${soon(moves)}: ${line}.`,
      `${capitalize(material)} won ${soon(moves)}: ${line}.`,
      `That nets ${material} ${soon(moves)}: ${line}.`,
    ],
    stopsThreat: (threat, material) => [
      `That stops ${threat}, which would have won ${material}.`,
      `No more ${threat}, which would have won ${material}.`,
      `${threat} is off the table now: it would have won ${material}.`,
    ],
    stopsMate: line => `The mate is stopped: ${line}.`,
    stopsLongMate: (moves, first) => `That stops a mate in ${moves}, starting with ${first}.`,
    escapes: (piece, threat) => [
      `${capitalize(the(piece))} gets out of the way of ${threat}.`,
      `${capitalize(the(piece))} steps out of reach of ${threat}.`,
    ],
    threatens: (threat, material) => [
      `The threat is ${threat} on the next move, winning ${material}.`,
      `Next it threatens ${threat}, which would win ${material}.`,
    ],
    threatensMate: (threat, moves) =>
      moves <= 1
        ? `Mate is threatened on the next move: ${threat}.`
        : `Mate is threatened ${within(moves)}, starting with ${threat}.`,
  };
}

// What a good move does: the error it punishes, the material it wins, the check.
type GoodMoveSentences = Pick<
  FactSentences,
  | 'punishesAtOnce'
  | 'offered'
  | 'keepsAdvantage'
  | 'holdsPosition'
  | 'promotes'
  | 'castles'
  | 'takesBack'
  | 'winsForFree'
  | 'winsMaterial'
  | 'checkForces'
  | 'littleMorePrecise'
>;

function goodMovesEn(viewer: Viewer): GoodMoveSentences {
  const party = (color: Color, ...seed: readonly string[]): Party =>
    partyOf(viewer, color, seed.join('|'));
  const the = (piece: Piece): string => definite(viewer, piece);
  return {
    punishesAtOnce: color => {
      const whose = party(color, 'punishes').possessive;
      return [
        `${capitalize(whose)} mistake is punished right away.`,
        `That makes ${whose} mistake pay at once.`,
        `Straight to the point: ${whose} mistake doesn’t go unpunished.`,
      ];
    },
    offered: (piece, color) =>
      `${capitalize(the(piece))} is offered, and ${party(color, piece.role).name} can’t safely take it.`,
    keepsAdvantage: [
      'Every other move would have let the advantage slip.',
      'The only way to keep the advantage, and it was found.',
    ],
    holdsPosition: color => {
      const holder = party(color, 'holds').name;
      return [
        `Every other move would have left ${holder} worse off.`,
        `The only move that didn’t leave ${holder} worse off.`,
      ];
    },
    promotes: piece => `The pawn promotes to ${indefinite(piece)}.`,
    castles: [
      'The king is safe, and the rook joins the game.',
      'Castled: the king tucked away, the rook ready for action.',
    ],
    takesBack: square => [`A recapture on ${square}.`, `Taking back on ${square}, as expected.`],
    winsForFree: piece => [
      `${capitalize(indefinite(piece))} for free.`,
      `That wins ${indefinite(piece)} for free.`,
      `Free material: ${indefinite(piece)} with nothing in return.`,
    ],
    winsMaterial: (won, given) => [
      `That wins ${indefinite(won)} for ${indefinite(given)}.`,
      `${capitalize(indefinite(won))} won for ${indefinite(given)}: a good trade.`,
    ],
    checkForces: color => {
      const checked = party(color, 'check');
      return [
        `The check forces ${checked.name} to respond.`,
        `Check! ${subject(checked)} ${agree(checked, 'has', 'have')} to respond.`,
      ];
    },
    littleMorePrecise: best => [
      `${best} was a little more precise.`,
      `${best} was slightly better.`,
      `${best} was a touch more accurate.`,
    ],
  };
}

export function factsEn(viewer: Viewer): FactSentences {
  const party = (color: Color, ...seed: readonly string[]): Party =>
    partyOf(viewer, color, seed.join('|'));
  const the = (piece: Piece): string => definite(viewer, piece);
  return {
    checkmate: king =>
      `Checkmate: ${viewer === null ? `the ${king} king` : `${party(king, 'king').possessive} king`} has nowhere to go.`,
    matedIn: (best, moves) => `${best} mated in ${moves}.`,
    heldOutLonger: best => `${best} held out longer.`,
    canForceMate: (color, reply) =>
      `${subject(party(color, reply))} can now force mate, starting with ${reply}.`,
    wouldForceMate: (best, moves) => `${best} would have forced mate in ${moves}.`,
    missedPunishment: (color, best) =>
      `${capitalize(party(color, best).possessive)} last move was a mistake, and ${best} would have punished it.`,
    unfinishedPunishment: (color, best) =>
      `${capitalize(party(color, 'earlier', best).possessive)} earlier mistake was still there to punish: ${best} would have finished the job.`,
    leftUndefended: ({ piece, square, reply }) =>
      `${capitalize(the(piece))} on ${square} is left undefended: ${reply} wins it.`,
    answersAndWins: (color, { piece, square, reply }) => {
      const taker = party(color, reply, square);
      return `${subject(taker)} ${agree(taker, 'answers', 'answer')} ${reply} and ${agree(taker, 'wins', 'win')} ${the(piece)} on ${square}.`;
    },
    strongerCapture: (best, piece) => `${best}, taking ${the(piece)}, was stronger.`,
    morePrecise: best => [`${best} was more precise.`, `${best} was better here.`],
    betterMove: best => [`${best} was the better move.`, `Better was ${best}.`],
    ...goodMovesEn(viewer),
    forks: (first, second) => `A fork: it attacks ${both(viewer, first, second)} at once.`,
    missedFork: (best, first, second) =>
      `${best} was a fork, attacking ${both(viewer, first, second)}.`,
    allowsFork: (reply, first, second) => [
      `That allows ${reply}, a fork of ${both(viewer, first, second)}.`,
      `Now ${reply} forks ${both(viewer, first, second)}.`,
    ],
    canPlay: (color, reply) => [
      `That lets ${party(color, reply).name} play ${reply}.`,
      `${reply} becomes possible.`,
      `Now ${party(color, 'now', reply).name} can play ${reply}.`,
    ],
    ...lineFactsEn(viewer),
    ...plansEn(viewer),
  };
}
