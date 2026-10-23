import type { Color } from '#shared/chess/types.ts';
import { capitalize } from './fr-grammar.ts';
import type { BookCount, BookError, BookSource, PracticeStrings } from './practice-types.ts';
import type { Ways } from './types.ts';
import { modesFr } from './fr-practice-modes.ts';
import { homeFr } from './fr-practice-home.ts';
import { FR_IDEAS } from './fr-ideas.ts';

// The coach's words while practicing an opening against the explorer's games.

const PERCENT = new Intl.NumberFormat('fr', { style: 'percent' });
const FINE_PERCENT = new Intl.NumberFormat('fr', { style: 'percent', maximumFractionDigits: 1 });

/** "45 %", and "0,4 %" for a rare move, which would read as never played. */
const percent = (share: number): string => (share < 0.01 ? FINE_PERCENT : PERCENT).format(share);

/** Fewer games than this, and a share reads as counts: "2 parties sur 3", not "67 %". */
const FEW = 10;

/** "45 %", or "2 parties sur 3" for a position few games reached. */
const amount = ({ games: played, of }: BookCount): string =>
  of < FEW ? `${played} partie${played === 1 ? '' : 's'} sur ${of}` : percent(played / of);

const sideName = (side: Color): string => (side === 'white' ? 'les Blancs' : 'les Noirs');

/** "tes parties", "les parties de DrNykterstein", the masters', Lichess players'. */
function gamesOf(source: BookSource): string {
  if (source.db !== 'player')
    return source.db === 'masters' ? 'les parties de maîtres' : 'les parties de Lichess';
  return source.you ? 'tes parties' : `les parties de ${source.player}`;
}

/** "des parties de maîtres", "de tes parties": the same, after a share. */
const ofGames = (source: BookSource): string => {
  const text = gamesOf(source);
  return text.startsWith('les ') ? `des ${text.slice(4)}` : `de ${text}`;
};

/** "2 de tes 3 parties", "la seule partie de maître": few games, counted. */
function counted(source: BookSource, { games: played, of }: BookCount): string {
  if (source.db === 'player' && source.you)
    return of === 1 ? 'ta seule partie' : `${played} de tes ${of} parties`;
  const whose = (plural: boolean): string => {
    if (source.db === 'player') return `de ${source.player}`;
    if (source.db === 'masters') return plural ? 'de maîtres' : 'de maître';
    return 'de Lichess';
  };
  return of === 1
    ? `la seule partie ${whose(false)}`
    : `${played} des ${of} parties ${whose(true)}`;
}

/** "comme les maîtres", "avec tes propres coups": whose moves the coach answers with. */
function likeWho(source: BookSource): string {
  if (source.db !== 'player')
    return source.db === 'masters' ? 'comme les maîtres' : 'comme les joueurs de Lichess';
  return source.you ? 'avec tes propres coups' : `avec les coups de ${source.player}`;
}

/** A move no game of the book played. */
function nobodyPlays(source: BookSource, move: string): Ways {
  if (source.db === 'player')
    return source.you
      ? [`Tu n’as jamais joué ${move} ici.`, `${move} ? Ce n’est pas ton genre.`]
      : [`${source.player} ne joue jamais ${move} ici.`];
  return source.db === 'masters'
    ? [`Aucun maître ne joue ${move} ici.`, `${move} ? Les maîtres n’y vont jamais.`]
    : [`Personne ne joue ${move} ici sur Lichess.`, `${move} ? Personne n’ose sur Lichess.`];
}

const ERRORS: Readonly<Record<BookError, string>> = {
  mistake: 'une erreur',
  miss: 'une occasion manquée',
  blunder: 'une gaffe',
};

export const practiceFr: PracticeStrings = {
  start: 'S’entraîner aux ouvertures',
  side: side => `Tu joues ${sideName(side)}`,
  intro: source => [
    `Montre-moi ton ouverture ! Je réponds ${likeWho(source)}.`,
    `C’est parti ! Je joue ${likeWho(source)}.`,
    `Ton ouverture, ma théorie : je réponds ${likeWho(source)}.`,
  ],
  switchSide: side => `Jouer ${sideName(side)}`,
  yourMove: ['À toi !', 'À toi de jouer !', 'Ton coup ?', 'Et maintenant ?'],
  kinds: {
    main: '{m} est le coup principal',
    popular: '{m} est un choix courant',
    sideline: '{m} est une ligne secondaire',
    rare: '{m} est un coup rare',
  },
  share: (source, count) =>
    count.of < FEW
      ? [`Vu dans ${counted(source, count)}.`]
      : [
          `${amount(count)} ${ofGames(source)} passent par là.`,
          `Joué dans ${amount(count)} ${ofGames(source)}.`,
        ],
  mainIs: (move, count) => [
    `La plupart jouent ${move} (${amount(count)}).`,
    `Le favori : ${move} (${amount(count)}).`,
  ],
  doubts: error => `Attention : le moteur y voit ${ERRORS[error]}.`,
  answers: (side, move) => {
    const name = capitalize(sideName(side));
    return [`${name} répondent ${move}.`, `${name} jouent ${move}.`, `Et voici ${move} !`];
  },
  punish: error => [
    `C’est ${ERRORS[error]} : punis-la !`,
    `${capitalize(ERRORS[error])} ! Fais-les payer.`,
  ],
  outTitle: '{m} sort de la théorie',
  refused: [
    'Non, pas celui-là !',
    'Hmm, pas celui-là !',
    'Pas dans ma théorie !',
    'Attends, essaie autre chose !',
  ],
  dubiousTitle: '{m} cède du terrain',
  refusedDubious: [
    'Hmm, le moteur fait la grimace !',
    'Attends, il y a mieux !',
    'Risqué, celui-là !',
  ],
  tryAgain: ['Essaie encore', 'Encore un essai', 'Cherche encore'],
  missedOut: (source, move) => nobodyPlays(source, move),
  missedDubious: move => [
    `${move} se joue, mais il cède du terrain.`,
    `${move} ? Le moteur a mieux.`,
  ],
  missedRare: (_source, move, count) => [
    `${move} est un coup rare (${amount(count)}).`,
    `${move} ? Presque personne ne le joue (${amount(count)}).`,
  ],
  findBook: source => {
    if (source.db === 'player')
      return [
        source.you ? 'Retrouve ton coup habituel !' : `Retrouve le coup de ${source.player} !`,
      ];
    const who = source.db === 'masters' ? 'les maîtres' : 'les joueurs de Lichess';
    return [
      `Trouve le coup que jouent ${who} !`,
      `Que jouent ${who} ici ?`,
      `Pense comme ${who} !`,
    ];
  },
  stuck: [
    'Bloqué ? Prends un indice !',
    'Un indice peut aider !',
    'Besoin d’un coup de pouce ? Demande un indice.',
  ],
  revealedTitle: '{m} est le coup de la théorie',
  endTitle: ['Fin de la théorie', 'Hors des livres'],
  doneTitle: ['Ligne terminée !', 'Ligne bouclée !', 'Et voilà !'],
  lineDone: ['Réussi !', 'Bien joué !', 'Tout en finesse !', 'Comme un pro !'],
  streak: moves => `${moves} coups de théorie d’affilée`,
  bestStreak: moves => [
    `Meilleure série : ${moves} d’affilée !`,
    `${moves} d’affilée : tu es en feu !`,
  ],
  review: count => `Réviser (${count})`,
  end: [
    'La théorie s’arrête là !',
    'Plus de théorie : à toi d’improviser !',
    'Le livre s’arrête ici !',
  ],
  tally: (inBook, main) => {
    const moves = `${inBook} coup${inBook === 1 ? '' : 's'} de théorie`;
    if (main === inBook)
      return inBook === 1 ? 'Le coup principal. Bien joué !' : `${moves}, tous principaux.`;
    if (main === 0) return `${moves}, hors des sentiers battus.`;
    return `${moves}, dont ${main} principa${main === 1 ? 'l' : 'ux'}.`;
  },
  missesTally: misses =>
    misses === 1
      ? ['Un coup repris.', 'Un seul faux pas.']
      : [`${misses} coups repris.`, `${misses} faux pas en route.`],
  takeBack: 'Reprendre',
  again: 'Recommencer',
  reveal: 'Solution',
  computer: 'Contre l’ordinateur',
  failed: 'L’explorateur d’ouvertures ne répond pas.',
  modes: modesFr,
  ideas: FR_IDEAS,
  page: {
    home: homeFr,
    title: 'Entraînement aux ouvertures',
    back: 'Autre ouverture',
    pick: 'Choisis une ouverture',
    pickWhy:
      'Choisis une ligne ou joue quelques coups, puis lance-toi. Je réponds avec la théorie !',
    youPlay: 'Tu joues',
    sides: { white: 'Les Blancs', black: 'Les Noirs' },
    bookLabel: 'Les coups de',
    books: { masters: 'Maîtres', lichess: 'Lichess', player: 'Mes parties' },
    linesLabel: 'Lignes',
    lines: { main: 'Lignes principales', all: 'Toutes les lignes' },
    lengthLabel: 'Longueur',
    length: moves => (moves === 0 ? 'Tous' : String(moves)),
    movesSum: moves => (moves === 0 ? 'Tous les coups' : `${moves} coups`),
    toReview: count => `À revoir (${count})`,
    firstMove: 'Ton premier coup',
    syncLabel: 'Progression',
    syncOn: 'La garder dans mes études Lichess',
    synced: 'Gardée dans tes études',
    syncing: 'Enregistrement…',
    syncFailed: 'Pas enregistrée : réessaie',
    syncOpen: 'Ouvrir l’étude',
    syncStop: 'Arrêter',
    syncSum: 'Gardée',
    record: (found, positions) =>
      `${found} % trouvés du premier coup, sur ${positions} ${positions === 1 ? 'position' : 'positions'}`,
    fromHere: 'Depuis ici',
    search: 'Chercher une ouverture',
    popular: side => `Ouvertures populaires avec ${sideName(side)}`,
    found: 'Ouvertures trouvées',
    noResult: 'Aucune ouverture de ce nom.',
    searchFailed: 'La recherche ne répond pas.',
    share: percent,
    line: 'Ta ligne',
    kindNames: {
      main: 'Coup principal',
      popular: 'Choix courant',
      sideline: 'Ligne secondaire',
      rare: 'Coup rare',
      out: 'Hors théorie',
    },
    signedOut:
      'Connecte-toi d’abord à Lichess : son explorateur d’ouvertures est réservé aux membres.',
  },
};
