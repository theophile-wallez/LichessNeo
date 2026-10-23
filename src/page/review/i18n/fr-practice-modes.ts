import type { Color } from '#shared/chess/types.ts';
import type { Mastery } from '#page/review/practice/mastery.ts';
import type { OwnKind, PracticeModeStrings, Standing } from './practice-mode-types.ts';

// The coach's words in practice's modes, in French.

const sideName = (side: Color): string => (side === 'white' ? 'les Blancs' : 'les Noirs');

const STANDINGS: Readonly<Record<Standing, (side: Color) => string>> = {
  equal: () => 'c’est de nouveau égal',
  better: side => `${sideName(side)} sont un peu mieux`,
  clearly: side => `${sideName(side)} sont nettement mieux`,
  winning: side => `${sideName(side)} gagnent`,
};

const OWN: Readonly<Record<OwnKind, string>> = { study: 'ton étude', repertoire: 'ton répertoire' };

const MASTERIES: Readonly<Record<Mastery, string>> = {
  new: 'nouvelle',
  learning: 'en cours',
  known: 'connue',
  mastered: 'maîtrisée',
};

const THEMES: Readonly<Record<string, string>> = {
  fork: 'Cherche une fourchette !',
  pin: 'Il y a un clouage à exploiter !',
  skewer: 'Une enfilade t’attend !',
  discoveredAttack: 'Pense à l’attaque à la découverte !',
  hangingPiece: 'Quelque chose est en prise !',
  trappedPiece: 'Une pièce est piégée !',
  mateIn1: 'Mat en un !',
  mateIn2: 'Mat en deux !',
  mateIn3: 'Mat en trois !',
  doubleCheck: 'Échec double !',
  sacrifice: 'N’aie pas peur de sacrifier !',
  deflection: 'Détourne un défenseur !',
  attraction: 'Attire le roi dehors !',
  kingsideAttack: 'Fonce sur le roi !',
};

const games = (count: number): string => `${count} partie${count === 1 ? '' : 's'}`;

export const modesFr: PracticeModeStrings = {
  deviatedTitle: '{m} n’est pas ton coup',
  deviated: ['Ton répertoire joue autre chose ici !', 'Ce n’est pas ton coup habituel !'],
  deviatedChoice: move => `Reprends-le, ou fais de ${move} ton coup.`,
  adopt: 'C’est mon coup',
  refutation: (move, reply, standing, side) => [
    `Après ${move}, ${reply} ! et ${STANDINGS[standing](side)}.`,
    `${move} se heurte à ${reply} : ${STANDINGS[standing](side)}.`,
  ],
  ownIntro: (kind, name) =>
    kind === 'study'
      ? [`${name} : montre-moi ta prépa !`, `Ton étude, ${name}. Voyons ça !`]
      : ['Ton répertoire, ligne par ligne !', 'On joue ton répertoire !'],
  ownMain: kind => [`La ligne principale de ${OWN[kind]}.`, `Tout droit sorti de ${OWN[kind]} !`],
  ownOther: kind => [`Une des lignes de ${OWN[kind]}.`, `Une ligne de ${OWN[kind]}, aussi.`],
  ownOut: (kind, move) => [
    `${move} n’est pas dans ${OWN[kind]}.`,
    `${move} ? Pas dans ${OWN[kind]}.`,
  ],
  ownFind: kind => [`Trouve le coup de ${OWN[kind]} !`, `Que joue ${OWN[kind]} ici ?`],
  ownOutTitle: kind => `{m} n’est pas dans ${OWN[kind]}`,
  revealedTitle: '{m} était le coup',
  habitTitle: '{m}, comme d’habitude',
  habit: move => [
    `Encore ${move} ! Trouve mieux.`,
    `C’est ton habitude, ${move} : essaie autre chose !`,
  ],
  aimMissed: ['Pas celui-là : trouve mieux !', 'Hmm, il y a mieux !'],
  gamesIntro: (times, of, move) => `Tu as joué ${move} ici dans ${times} de tes ${games(of)}.`,
  gamesFind: why =>
    why === 'repertoire'
      ? ['Joue le coup de ton répertoire !', 'Ton répertoire a un autre coup !']
      : ['Trouve ce que jouent les maîtres !', 'Les maîtres jouent autre chose !'],
  gamesDone: ['Habitude corrigée !', 'Déjà mieux !', 'C’est celui-là !'],
  nextDrill: 'Suivant',
  goalMet: days =>
    days > 1
      ? `Objectif du jour atteint ! ${days} jours d’affilée.`
      : 'Objectif du jour atteint ! À demain.',
  mastery: (name, mastery) => `${name} : ${MASTERIES[mastery]} !`,
  grew: moves =>
    moves === 0
      ? 'Sans faute ! La prochaine fois, jusqu’au bout de la théorie.'
      : `Sans faute ! La prochaine fois, ${moves} coups de profondeur.`,
  reviewIntro: ['Tu te souviens de celle-là ?', 'Tu es déjà passé par là !', 'Que joues-tu ici ?'],
  reviewFound: ['Trouvé !', 'Oui !', 'Toujours affûté !', 'Bonne mémoire !'],
  reviewDone: 'Révision terminée !',
  reviewSummary: (clean, total) => `${clean} sur ${total} du premier coup.`,
  blitzGo: ['Joue-la !', 'Vas-y !', 'Vite !'],
  blitzMissed: 'C’était {m} !',
  timeUp: 'Temps écoulé !',
  blitzScore: (score, played) => `${score} bons coups sur ${played}.`,
  blitzNone: ['Pas un coup ? On remet ça !', 'Trop lent ! On rejoue ?'],
  newRecord: ['Nouveau record !', 'Ton meilleur score !'],
  bestWas: best => `Ton record : ${best}.`,
  playAgain: 'Rejouer',
  trapWatch: 'Piège en vue',
  trapWatchWords: ['Regarde bien son coup…', 'Ça arrive…'],
  trapTitle: 'Punis-le !',
  trapIntro: move => [`${move} ? Fais-le payer !`, `Il a joué ${move} : punis-le !`],
  trapTheme: theme => THEMES[theme] ?? null,
  trapDone: ['Piège puni !', 'Tu l’as eu !', 'Aïe, pour lui !'],
  trapsSummary: (solved, total) => `${solved} sur ${total} punis du premier coup.`,
  nextTrap: 'Piège suivant',
  trapsLoading: 'Je tends les pièges…',
  trapsFailed: 'Lichess souffle un peu : réessaie dans quelques minutes.',
  noTraps: 'Aucun piège trouvé pour cette ouverture.',
  quizTitle: 'Quelle est cette ouverture ?',
  quizWords: ['Nomme-la !', 'Devine l’ouverture !', 'Tu la connais ?'],
  quizRight: name => [`Oui ! ${name}.`, `Exact, ${name} !`],
  quizWrong: name => [`Non, c’est ${name}.`, `Presque : ${name}.`],
  quizDone: 'Quiz terminé !',
  quizScore: (score, total) => `${score} bonnes réponses sur ${total}.`,
  finish: 'Terminer',
  next: 'Suivant',
};
