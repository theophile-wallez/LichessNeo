import type { Color } from '#shared/chess/types.ts';
import type { PracticeHomeStrings } from './practice-mode-types.ts';

// The practice page's home and its own pages, in French.

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

const sideName = (side: Color): string => (side === 'white' ? 'les Blancs' : 'les Noirs');

export const homeFr: PracticeHomeStrings = {
  streakDays: days => plural(days, 'jour'),
  streakTip: 'Jours d’affilée avec l’objectif du jour atteint',
  today: (moves, goal) => `${Math.min(moves, goal)}/${goal}`,
  todayTip: 'Coups travaillés aujourd’hui, sur l’objectif du jour',
  known: positions => String(positions),
  knownTip: 'Positions connues',
  modes: {
    review: 'Révision du jour',
    reviewDue: count => `${plural(count, 'position')} à revoir`,
    reviewNone: 'Tout est à jour',
    traps: 'Pièges',
    trapsSub: 'Punis les erreurs',
    blitz: 'Chrono',
    blitzSub: best => (best > 0 ? `1 minute · record ${best}` : '1 minute, vas-y !'),
    quiz: 'Devine',
    quizSub: best => (best > 0 ? `Nomme l’ouverture · record ${best}` : 'Nomme l’ouverture'),
    games: 'Mes parties',
    gamesSub: 'Corrige tes habitudes',
    repertoire: 'Mon répertoire',
    repertoireSub: positions =>
      positions > 0 ? plural(positions, 'position') : 'Tes lignes, tes études',
  },
  dueTitle: 'L’heure de réviser',
  dueWords: count =>
    count === 1
      ? 'Une position veut te revoir aujourd’hui !'
      : `${count} positions veulent te revoir aujourd’hui !`,
  favorites: 'Tes favorites',
  masteries: { new: 'Nouvelle', learning: 'En cours', known: 'Connue', mastered: 'Maîtrisée' },
  masteryTip: (found, positions) =>
    `${found} % trouvés du premier coup, sur ${plural(positions, 'position')}`,
  yourPlan: 'Ton plan',
  theirPlan: 'Son plan',
  trapsTitle: 'Pièges',
  trapsWhy: 'Choisis une ouverture : les erreurs de ses vraies parties sont à toi de punir.',
  gamesTitle: 'Mes parties',
  gamesWhy: 'Tes dernières parties, lues pour les coups que tu rates souvent.',
  gamesLoading: 'Je lis tes parties…',
  gamesFailed: 'Tes parties ne se sont pas chargées : réessaie plus tard.',
  gamesNone: 'Aucune habitude à corriger dans tes dernières parties. Bravo !',
  drillCard: (times, games) => `dans ${times} partie${times === 1 ? '' : 's'} sur ${games}`,
  drillWhy: { repertoire: 'Pas le coup de ton répertoire', book: 'Les maîtres jouent mieux' },
  drillsStart: 'Tout corriger',
  repertoireTitle: 'Mon répertoire',
  tabs: { mine: 'Mes lignes', studies: 'Mes études' },
  treeWhy: 'Tes lignes, telles que tu les joues. Mets tes préférées en favorites !',
  treeEmpty: 'Joue quelques lignes : les positions rencontrées s’affichent ici.',
  practiceLine: 'Travailler cette ligne',
  star: 'Favorite',
  unstar: 'Retirer des favorites',
  prune: 'Supprimer',
  pruneConfirm: 'Supprimer cette ligne et tout ce qui suit ?',
  studiesWhy: 'Entraîne-toi sur une de tes études : ses coups sont ceux à trouver.',
  studiesLoading: 'Je lis tes études…',
  studiesFailed: 'Tes études ne se sont pas chargées.',
  studiesNone: 'Pas encore d’étude à toi.',
  chapters: count => plural(count, 'chapitre'),
  chapterSide: side => `Avec ${sideName(side)}`,
  noChapter: 'Aucun chapitre à travailler : ils partent d’une position à eux, ou n’ont aucun coup.',
  movesLabel: 'Tes coups',
  moves: { mine: 'Mon répertoire', any: 'Tout bon coup' },
  levelLabel: 'Adversaires',
  levels: { all: 'Tous', mine: 'Mon niveau' },
  levelMine: rating => `Mon niveau (${rating})`,
  goalLabel: 'Objectif du jour',
  goal: moves => `${moves} coups`,
  autoLength: 'Évolutive',
  autoSum: 'Lignes évolutives',
  home: 'Retour',
};
