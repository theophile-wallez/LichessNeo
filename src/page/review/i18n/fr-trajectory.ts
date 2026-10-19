import type { Color } from '#shared/chess/index.ts';
import { conjugate, had, has, partyOf, type Party, says, withDe } from './fr-grammar.ts';
import type { TrajectorySentences, Viewer } from './types.ts';

// How a move changed the game: « L’équilibre est rompu : maintenant l’adversaire a un net avantage. »

type Changes = Pick<
  TrajectorySentences,
  'wasBalanced' | 'nowBalanced' | 'grows' | 'shrinks' | 'swings'
>;

// The sentences for an advantage that changes.
function changesFr(viewer: Viewer): Changes {
  const party = (color: Color): Party => partyOf(viewer, color);
  return {
    wasBalanced: (after, forMover) => {
      const ahead = `${has(party(after.side))} ${after.advantage}`;
      return [
        `La partie était équilibrée, ${forMover ? 'et' : 'mais'} maintenant ${ahead}.`,
        `L’équilibre est rompu : maintenant ${ahead}.`,
        `Fini l’égalité : ${ahead}.`,
        `La balance penche : ${ahead}.`,
      ];
    },
    nowBalanced: before => [
      `${had(party(before.side))} ${before.advantage}, mais la partie est maintenant équilibrée.`,
      'La partie redevient équilibrée.',
      'Retour à l’égalité.',
      'L’équilibre est rétabli.',
    ],
    grows: (color, from, to) => {
      const ahead = party(color);
      return [
        `${says(ahead, 'passes', 'passe', 'passent')} ${withDe(from)} à ${to}.`,
        `L’écart se creuse : maintenant ${has(ahead)} ${to}.`,
        `L’avantage grandit : ${has(ahead)} maintenant ${to}.`,
        `Encore mieux pour ${ahead.object ?? 'toi'} : ${to} désormais.`,
      ];
    },
    shrinks: (color, from, to) => {
      const ahead = party(color);
      const left = `il ne ${conjugate(ahead, 'te', 'lui', 'leur')} reste qu’${to}`;
      return [
        `${had(ahead)} ${from}, ${left}.`,
        ahead.of === null
          ? `Ton avantage fond : il ne te reste qu’${to}.`
          : `L’avantage ${ahead.of} fond : ${left}.`,
        `L’écart se réduit pour ${ahead.object ?? 'toi'} : ${left}.`,
      ];
    },
    swings: (before, after) => {
      const ahead = `${has(party(after.side))} ${after.advantage}`;
      return [
        `${had(party(before.side))} ${before.advantage}, mais maintenant ${ahead}.`,
        `La partie bascule : maintenant ${ahead}.`,
        `Retournement complet : maintenant ${ahead}.`,
        `Tout change : ${ahead}.`,
      ];
    },
  };
}

export function trajectoryFr(viewer: Viewer): TrajectorySentences {
  const party = (color: Color): Party => partyOf(viewer, color);
  return {
    ...changesFr(viewer),
    advantages: [
      '',
      'un léger avantage',
      'un net avantage',
      'une position gagnante',
      'un mat forcé',
    ],
    mateIn: moves => `un mat en ${moves}`,
    stillBalanced: [
      'La partie reste équilibrée.',
      'L’équilibre tient toujours.',
      'Les chances restent égales.',
      'Toujours l’égalité.',
      'Personne ne prend le dessus.',
    ],
    stillAhead: ({ side, advantage }) => [
      `${says(party(side), 'as', 'a', 'ont')} toujours ${advantage}.`,
      `${says(party(side), 'gardes', 'garde', 'gardent')} ${advantage}.`,
      `Rien ne change : ${has(party(side))} toujours ${advantage}.`,
    ],
    turningPoint: [
      'C’est le tournant de la partie.',
      'Le moment clé de la partie.',
      'La partie s’est jouée ici.',
      'Tout s’est décidé ici.',
    ],
  };
}
