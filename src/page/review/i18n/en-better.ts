import type { Color, Piece } from '#shared/chess/index.ts';
import { capitalize, definite, pairOf, partyOf, type Party } from './en-grammar.ts';
import type { FactSentences, Viewer } from './types.ts';

// The move that was better than the one played, and what it did, said after
// it: "Better was Nf6, developing your knight."
type BetterMoveSentences = Pick<
  FactSentences,
  | 'missedPunishment'
  | 'unfinishedPunishment'
  | 'strongerCapture'
  | 'morePrecise'
  | 'betterMove'
  | 'littleMorePrecise'
  | 'missedFork'
>;

// What a miss let go.
function missesEn(
  viewer: Viewer,
): Pick<BetterMoveSentences, 'missedPunishment' | 'unfinishedPunishment'> {
  const party = (color: Color): Party => partyOf(viewer, color);
  return {
    missedPunishment: (color, best, why) => {
      const whose = party(color).possessive;
      const what = why ? `, ${why}` : '';
      return [
        `${capitalize(whose)} last move was a mistake, and ${best} would have punished it${what}.`,
        `${capitalize(whose)} mistake goes unpunished: ${best} was the answer${what}.`,
        `Missed: ${best} would have made ${whose} mistake pay${what}.`,
      ];
    },
    unfinishedPunishment: (color, best) => {
      const whose = party(color).possessive;
      return [
        `${capitalize(whose)} earlier mistake was still there to punish: ${best} would have finished the job.`,
        `${capitalize(whose)} earlier mistake could still be punished: ${best} finished it off.`,
        `The job wasn’t done: ${best} still punished ${whose} earlier mistake.`,
      ];
    },
  };
}

export function betterMovesEn(viewer: Viewer): BetterMoveSentences {
  const the = (piece: Piece): string => definite(viewer, piece);
  const both = (first: Piece, second: Piece): string => pairOf(viewer, first, second);
  return {
    ...missesEn(viewer),
    strongerCapture: (best, piece) => [
      `${best}, taking ${the(piece)}, was stronger.`,
      `Taking ${the(piece)} with ${best} was stronger.`,
      `Stronger was ${best}, which takes ${the(piece)}.`,
    ],
    morePrecise: (best, why) =>
      why
        ? [
            `${best} was more precise, ${why}.`,
            `Better here was ${best}, ${why}.`,
            `More precise was ${best}, ${why}.`,
          ]
        : [
            `${best} was more precise.`,
            `${best} was better here.`,
            `More accurate was ${best}.`,
            `${best} was the cleaner move.`,
          ],
    betterMove: (best, why) =>
      why
        ? [
            `Better was ${best}, ${why}.`,
            `${best} was the better move, ${why}.`,
            `The move was ${best}, ${why}.`,
          ]
        : [
            `${best} was the better move.`,
            `Better was ${best}.`,
            `${best} was called for here.`,
            `The right move was ${best}.`,
          ],
    littleMorePrecise: (best, why) =>
      why
        ? [
            `${best} was a little more precise, ${why}.`,
            `${best} was slightly better, ${why}.`,
            `A touch better was ${best}, ${why}.`,
          ]
        : [
            `${best} was a little more precise.`,
            `${best} was slightly better.`,
            `${best} was a touch more accurate.`,
            `${best} was a hair more accurate.`,
          ],
    missedFork: (best, first, second) => [
      `${best} was a fork, attacking ${both(first, second)}.`,
      `${best} forked ${both(first, second)}.`,
      `A fork was there: ${best}, on ${both(first, second)}.`,
    ],
  };
}
