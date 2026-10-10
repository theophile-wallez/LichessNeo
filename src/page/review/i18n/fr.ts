import { html } from '#shared/html.ts';
import type { Color } from '#shared/chess/types.ts';
import { factsFr, trajectoryFr } from './fr-comment.ts';
import { capitalize, conjugate, partyOf, typography } from './fr-grammar.ts';
import { remarksFr } from './fr-remarks.ts';
import type { CountedClass, MoveClass } from '#page/review/classes/classes.ts';
import type {
  ClockStrings,
  InterfaceStrings,
  RetryStrings,
  ReviewLanguage,
  Viewer,
} from './types.ts';

const COUNT_LABELS: Readonly<Record<CountedClass, readonly [string, string]>> = {
  brilliant: ['coup brillant', 'coups brillants'],
  great: ['excellent coup', 'excellents coups'],
  best: ['meilleur coup', 'meilleurs coups'],
};

const CLASS_PLURALS: Readonly<Record<MoveClass, string>> = {
  brilliant: 'Coups brillants',
  great: 'Excellents coups',
  book: 'Coups théoriques',
  best: 'Meilleurs coups',
  excellent: 'Très bons coups',
  good: 'Bons coups',
  inaccuracy: 'Imprécisions',
  mistake: 'Erreurs',
  miss: 'Coups manqués',
  blunder: 'Gaffes',
};

const INTERFACE: Omit<InterfaceStrings, 'retry' | 'clock' | 'playedLike'> = {
  review: 'Débrief',
  start: 'Démarrer le débrief',
  summary: 'Résumé',
  brief: {
    opening: name => html`Ouverture jouée : <b>${name}</b>.`,
    moments: (count, turning) => {
      const plural = count > 1 ? 's' : '';
      const found = html`J’ai repéré <b>${count} moment${plural} clé${plural}</b>`;
      return turning ? html`${found} : la partie a basculé sur ${turning}.` : html`${found}.`;
    },
    calm: 'Pas de grosse erreur dans cette partie : voyons-la coup par coup.',
    start: 'Commencer',
  },
  next: 'Suivant',
  explain: 'Expliquer',
  best: 'Meilleur',
  analysing: 'Analyse de la partie…',
  moves: 'Coups',
  profileTitle: 'Profil de jeu',
  profile: {
    opening: {
      name: 'Ouverture',
      how: 'Précision des coups avant le milieu de partie : jusqu’aux premiers échanges ou au développement des pièces, ou au mélange des deux camps.',
    },
    middlegame: {
      name: 'Milieu de partie',
      how: 'Précision des coups du milieu de partie jusqu’à la finale.',
    },
    endgame: {
      name: 'Finale',
      how: 'Précision une fois qu’il reste six pièces ou moins, rois et pions à part.',
    },
    tactics: {
      name: 'Tactique',
      how: 'Part des occasions tactiques saisies : coups brillants et très bons, face aux occasions manquées.',
    },
    defense: {
      name: 'Défense',
      how: 'Précision des coups joués en position inférieure, sous 35 % de chances de gain.',
    },
    conversion: {
      name: 'Conversion',
      how: 'Précision des coups joués en position supérieure, au-delà de 65 % de chances de gain.',
    },
  },
  accuracy: 'Précision',
  anonymous: 'Anonyme',
  close: 'Fermer le débrief',
  back: 'Retour',
  coach: 'Changer de coach',
  intro: 'Débriefons cette partie !',
  engineError: "Le moteur n'a pas pu démarrer.",
  liveIntro: 'Joue un coup, je te dirai ce que j’en pense.',
  thinking: 'Voyons ce coup…',
  startPosition: 'Position de départ',
  more: 'Voir tous les coups',
  less: 'Voir moins',
  gameRating: 'Classement de la partie',
  gameRatingTip: 'Donne une estimation du classement d’un joueur d’après une seule partie.',
  bestWas: move => `Le meilleur coup était ${move}.`,
  cost: percent => `−${percent} % de chances de gain`,
  lines: {
    best: line => `La meilleure suite était ${line}.`,
    allows: (move, line) => `${move} permet ${line}.`,
    show: 'Voir la ligne',
  },
  themes: { fork: 'Fourchette', hanging: 'Pièce en prise', mate: 'Mat', sacrifice: 'Sacrifice' },
};

const playedLike = (viewer: Viewer, color: Color, elo: number | null): [string, string] => {
  const player = partyOf(viewer, color, String(elo));
  return [
    `${capitalize(player.subject)} ${conjugate(player, 'as', 'a', 'ont')} joué comme un`,
    'Elo',
  ];
};

const retryStrings = (viewer: Viewer): RetryStrings => ({
  button: 'Réessayer',
  prompt: color =>
    viewer === color
      ? 'Trouve un meilleur coup.'
      : `Trouve un meilleur coup pour ${partyOf(viewer, color, 'retry').subject}.`,
  checking: 'Voyons voir…',
  found: move => `Oui ! ${move} est le bon coup.`,
  alsoGood: move => `${move} marche aussi. Bien vu !`,
  wrong: move => `Pas tout à fait : ce n’est pas ${move}. Essaie encore !`,
  same: 'C’est le coup joué dans la partie. Essaie autre chose !',
  reveal: 'Voir la réponse',
  revealed: best => `Le coup était ${best}.`,
});

const clockStrings = (viewer: Viewer): ClockStrings => ({
  rushed: (color, spent, clock) => {
    const player = partyOf(viewer, color, spent);
    return `${capitalize(player.subject)} ${conjugate(player, 'as', 'a', 'ont')} joué ce coup en ${spent} avec ${clock} restantes à la pendule : un peu plus de réflexion aurait payé ici.`;
  },
  timeTrouble: clock => `Avec seulement ${clock} à la pendule, c’était dur à trouver.`,
  paidOff: (color, spent) => {
    const player = partyOf(viewer, color, spent);
    return `${capitalize(player.subject)} ${conjugate(player, 'as', 'a', 'ont')} réfléchi ${spent} sur ce coup, et ça en valait la peine.`;
  },
  seconds: seconds => `${String(seconds).replace('.', ',')} s`,
  tipTitle: 'Conseil',
  praiseTitle: 'Temps bien investi',
});

/** French, the coach speaking to `viewer` of their own moves. */
export const french = (viewer: Viewer): ReviewLanguage => ({
  ui: {
    ...INTERFACE,
    playedLike: (color, elo) => playedLike(viewer, color, elo),
    retry: retryStrings(viewer),
    clock: clockStrings(viewer),
  },
  classLabels: {
    brilliant: 'Brillant',
    great: 'Excellent',
    book: 'Théorique',
    best: 'Meilleur',
    excellent: 'Très bien',
    good: 'Bon',
    inaccuracy: 'Imprécision',
    mistake: 'Erreur',
    miss: 'Manqué',
    blunder: 'Gaffe',
  },
  classSentences: {
    brilliant: '{m} est brillant !',
    great: '{m} est un excellent coup',
    book: '{m} est un coup théorique',
    best: '{m} est le meilleur coup',
    excellent: '{m} est très bien',
    good: '{m} est bon',
    inaccuracy: '{m} est une imprécision',
    mistake: '{m} est une erreur',
    miss: '{m} est un coup manqué',
    blunder: '{m} est une gaffe',
  },
  countLabel: (moveClass, count) => {
    const [one, many] = COUNT_LABELS[moveClass];
    return `${count} ${count > 1 ? many : one}`;
  },
  countTip: (color, moveClass, count) =>
    `${CLASS_PLURALS[moveClass]} des ${color === 'white' ? 'Blancs' : 'Noirs'}\u00a0: ${count}`,
  typography,
  openingLine: name => `Ouverture: ${name}.`,
  remarks: remarksFr,
  trajectory: trajectoryFr(viewer),
  facts: factsFr(viewer),
});

/** French as a watcher reads it: "les Blancs", "les Noirs". */
export const fr = french(null);
