import type { Color, Piece } from '#shared/chess/index.ts';
import { capitalize, owned, ownedBy, partyOf, type Party } from './fr-grammar.ts';
import type { FactSentences, Viewer } from './types.ts';

// The move that was better than the one played, and what it did, after « qui » :
// « Mieux valait Cf6, qui sortait ton cavalier. »
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
function missesFr(
  viewer: Viewer,
): Pick<BetterMoveSentences, 'missedPunishment' | 'unfinishedPunishment'> {
  const party = (color: Color): Party => partyOf(viewer, color);
  return {
    missedPunishment: (color, best, why) => {
      const last = ownedBy(party(color), 'ton dernier coup', 'le dernier coup');
      const mistake = ownedBy(party(color), 'ton erreur', 'l’erreur');
      const what = why ? ` : ce coup ${why}` : '';
      const which = why ? `, qui ${why}` : '';
      return [
        `${capitalize(last)} était une erreur, et ${best} l’aurait puni${what}.`,
        `${capitalize(mistake)} reste impunie : la réponse était ${best}${which}.`,
        `Occasion manquée : ${best} punissait ${last}${why ? `, et ${why}` : ''}.`,
      ];
    },
    unfinishedPunishment: (color, best) => {
      const earlier = ownedBy(party(color), 'ton erreur précédente', 'l’erreur précédente');
      return [
        `${capitalize(earlier)} restait à punir : ${best} aurait conclu.`,
        `${capitalize(earlier)} pouvait encore être punie : ${best} finissait le travail.`,
        `Le travail n’était pas fini : ${best} punissait encore ${earlier}.`,
      ];
    },
  };
}

export function betterMovesFr(viewer: Viewer): BetterMoveSentences {
  const the = (piece: Piece): string => owned(viewer, piece);
  const both = (first: Piece, second: Piece): string => `${the(first)} et ${the(second)}`;
  return {
    ...missesFr(viewer),
    strongerCapture: (best, piece) => [
      `${best}, qui prend ${the(piece)}, était plus fort.`,
      `Mieux valait ${best}, qui prenait ${the(piece)}.`,
      `Prendre ${the(piece)} avec ${best} était plus fort.`,
    ],
    morePrecise: (best, why) =>
      why
        ? [
            `Mieux valait ${best}, qui ${why}.`,
            `${best}, qui ${why}, était plus précis.`,
            `Plus précis : ${best}, qui ${why}.`,
          ]
        : [
            `${best} était plus précis.`,
            `${best} était mieux ici.`,
            `Plus juste : ${best}.`,
            `${best} était plus propre.`,
          ],
    betterMove: (best, why) =>
      why
        ? [
            `Il fallait jouer ${best}, qui ${why}.`,
            `${best} s’imposait : ce coup ${why}.`,
            `Le bon coup était ${best}, qui ${why}.`,
          ]
        : [
            `Il fallait jouer ${best}.`,
            `${best} s’imposait.`,
            `Le bon coup était ${best}.`,
            `Mieux valait ${best}.`,
          ],
    littleMorePrecise: (best, why) =>
      why
        ? [
            `${best}, qui ${why}, était un poil plus juste.`,
            `${best} était un peu plus précis : ce coup ${why}.`,
            `Un poil mieux : ${best}, qui ${why}.`,
          ]
        : [
            `${best} était un peu plus précis.`,
            `${best} était légèrement meilleur.`,
            `${best} était un poil plus juste.`,
            `${best} était à peine meilleur.`,
          ],
    missedFork: (best, first, second) => [
      `${best} faisait une fourchette sur ${both(first, second)}.`,
      `${best} fourchait ${both(first, second)}.`,
      `Une fourchette était là : ${best}, sur ${both(first, second)}.`,
    ],
  };
}
