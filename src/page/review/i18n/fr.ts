import { factsFr, trajectoryFr } from './fr-comment.ts';
import { typography } from './fr-grammar.ts';
import { remarksFr } from './fr-remarks.ts';
import type { CountedClass, MoveClass } from '#page/review/classes/classes.ts';
import type { ReviewLanguage } from './types.ts';

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

export const fr: ReviewLanguage = {
  ui: {
    review: 'Bilan',
    start: 'Démarrer le bilan',
    next: 'Suivant',
    explain: 'Expliquer',
    best: 'Meilleur',
    analysing: 'Analyse de la partie…',
    players: 'Joueurs',
    accuracy: 'Précision',
    anonymous: 'Anonyme',
    close: 'Fermer le bilan',
    back: 'Retour',
    coach: 'Changer de coach',
    intro: 'Passons en revue cette partie !',
    engineError: "Le moteur n'a pas pu démarrer.",
    liveIntro: 'Joue un coup, je te dirai ce que j’en pense.',
    thinking: 'Voyons ce coup…',
    startPosition: 'Position de départ',
    more: 'Voir tous les coups',
    less: 'Voir moins',
    gameRating: 'Classement de la partie',
    gameRatingTip: 'Donne une estimation du classement d’un joueur d’après une seule partie.',
    phases: {
      opening: 'Ouverture',
      tactics: 'Exercices tactiques',
      strategy: 'Stratégie',
      endgame: 'Finale',
    },
    bestWas: move => `Le meilleur coup était ${move}.`,
    cost: percent => `−${percent} % de chances de gain`,
    lines: {
      best: line => `La meilleure suite était ${line}.`,
      allows: (move, line) => `${move} permet ${line}.`,
      show: 'Voir la ligne',
    },
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
  trajectory: trajectoryFr,
  facts: factsFr,
};
