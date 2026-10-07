import type { Color, Piece } from '#shared/chess/index.ts';
import { agree, capitalize, definite, indefinite, partyOf, type Party } from './en-grammar.ts';
import type { FactSentences, TrajectorySentences, Viewer } from './types.ts';

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
      return `The game was balanced, ${forMover ? 'and' : 'but'} now ${ahead.name} ${agree(ahead, 'has', 'have')} ${after.advantage}.`;
    },
    nowBalanced: before =>
      `${subject(party(before.side, 'now', before.advantage))} had ${before.advantage}, but the game is now balanced.`,
    grows: (color, from, to) => {
      const ahead = party(color, from, to);
      return `${subject(ahead)} ${agree(ahead, 'goes', 'go')} from ${from} to ${to}.`;
    },
    shrinks: (color, from, to) =>
      `${subject(party(color, to, from))} had ${from}; now it’s only ${to}.`,
    swings: (before, after) => {
      const ahead = party(after.side, 'swings', after.advantage);
      return `${subject(party(before.side, 'swung', before.advantage))} had ${before.advantage}, but now ${ahead.name} ${agree(ahead, 'has', 'have')} ${after.advantage}.`;
    },
  };
}

// The pieces a fork hits: "the [rook] and the [queen]", or whose they are.
const both = (viewer: Viewer, first: Piece, second: Piece): string =>
  `${definite(viewer, first)} and ${definite(viewer, second)}`;

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
    morePrecise: best => `${best} was more precise.`,
    betterMove: best => `${best} was the better move.`,
    punishesAtOnce: color =>
      `It punishes ${party(color, 'punishes').possessive} mistake right away.`,
    offered: (piece, color) =>
      `${capitalize(the(piece))} is offered, and ${party(color, piece.role).name} can’t safely take it.`,
    keepsAdvantage: 'Every other move would have let the advantage slip.',
    holdsPosition: color =>
      `Every other move would have left ${party(color, 'holds').name} worse off.`,
    promotes: piece => `The pawn promotes to ${indefinite(piece)}.`,
    castles: 'The king is safe, and the rook joins the game.',
    takesBack: square => `It takes back on ${square}.`,
    winsForFree: piece => `It wins ${indefinite(piece)} for free.`,
    winsMaterial: (won, given) => `It wins ${indefinite(won)} for ${indefinite(given)}.`,
    checkForces: color => `The check forces ${party(color, 'check').name} to respond.`,
    littleMorePrecise: best => `${best} was a little more precise.`,
    forks: (first, second) => `A fork: it attacks ${both(viewer, first, second)} at once.`,
    missedFork: (best, first, second) =>
      `${best} was a fork, attacking ${both(viewer, first, second)}.`,
    allowsFork: (reply, first, second) =>
      `It allows ${reply}, a fork of ${both(viewer, first, second)}.`,
    canPlay: (color, reply) => `It lets ${party(color, reply).name} play ${reply}.`,
  };
}
