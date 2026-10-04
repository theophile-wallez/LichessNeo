import { isFrench, pageLocale } from '#shared/lang.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';
import type { EndReason, Result } from './outcome.ts';

// The game over's words, in French on a French page and English otherwise, as
// the review's. The buttons below the review's take Lichess's own labels.

type Forms = readonly [one: string, many: string];

/** A chess player's words, as tradition has them. */
export interface Quote {
  readonly text: string;
  readonly author: string;
}

export interface GameOverTexts {
  /** The card's title, naming the opponent the player beat. */
  readonly title: (result: Result, opponent: string) => string;
  /** The result in a word, over the title. */
  readonly results: Readonly<Record<Result, string>>;
  /** Under the player's accuracy. */
  readonly accuracy: string;
  /** Under the title: how it ended, '' when the status doesn't say. */
  readonly reasons: Readonly<Record<EndReason, string>>;
  readonly winner: string;
  /** On the loser's king, or on both kings for a draw. */
  readonly kingLabels: Readonly<Record<EndReason, string>>;
  readonly drawLabel: string;
  readonly analysing: string;
  /** The coach once the moves are counted; `accuracy` is formatted, null without a move. */
  readonly verdict: (result: Result, accuracy: string | null) => string;
  readonly failed: string;
  readonly review: string;
  readonly close: string;
  readonly anonymous: string;
  /** Under a count on the card, the number apart: "meilleurs coups", "coup manqué". */
  readonly countLabel: (moveClass: MoveClass, count: number) => string;
  /** Words for after a loss or a draw, under the coach's; none for a win. */
  readonly quotes: Readonly<Record<Exclude<Result, 'win'>, readonly Quote[]>>;
}

const CAPABLANCA = 'José Raúl Capablanca';
const TARTAKOWER = 'Savielly Tartakower';
const LASKER = 'Emanuel Lasker';

const FR_COUNTS: Readonly<Record<MoveClass, Forms>> = {
  brilliant: ['coup brillant', 'coups brillants'],
  great: ['excellent coup', 'excellents coups'],
  book: ['coup théorique', 'coups théoriques'],
  best: ['meilleur coup', 'meilleurs coups'],
  excellent: ['très bon coup', 'très bons coups'],
  good: ['bon coup', 'bons coups'],
  inaccuracy: ['imprécision', 'imprécisions'],
  mistake: ['erreur', 'erreurs'],
  miss: ['coup manqué', 'coups manqués'],
  blunder: ['gaffe', 'gaffes'],
};

const EN_COUNTS: Readonly<Record<MoveClass, Forms>> = {
  brilliant: ['brilliant move', 'brilliant moves'],
  great: ['great move', 'great moves'],
  book: ['book move', 'book moves'],
  best: ['best move', 'best moves'],
  excellent: ['excellent move', 'excellent moves'],
  good: ['good move', 'good moves'],
  inaccuracy: ['inaccuracy', 'inaccuracies'],
  mistake: ['mistake', 'mistakes'],
  miss: ['miss', 'misses'],
  blunder: ['blunder', 'blunders'],
};

const fr: GameOverTexts = {
  title: (result, opponent) =>
    ({ win: `Vous avez battu ${opponent} !`, loss: 'Vous avez perdu', draw: 'Partie nulle' })[
      result
    ],
  results: { win: 'Victoire', loss: 'Défaite', draw: 'Nulle' },
  accuracy: 'précision',
  reasons: {
    mate: 'par échec et mat',
    resign: 'par abandon',
    time: 'au temps',
    left: 'par forfait',
    stalemate: 'par pat',
    draw: '',
    other: '',
  },
  winner: 'Vainqueur',
  kingLabels: {
    mate: 'Échec et mat',
    resign: 'Abandon',
    time: 'Temps écoulé',
    left: 'Forfait',
    stalemate: 'Pat',
    draw: 'Nulle',
    other: 'Défaite',
  },
  drawLabel: 'Nulle',
  analysing: 'Un instant, le temps que votre Bilan se prépare…',
  verdict: (result, accuracy) => {
    const opening = { win: 'Belle victoire !', loss: 'Pas cette fois !', draw: 'Partie serrée !' };
    if (accuracy === null) return `${opening[result]} Voyons la partie ensemble.`;
    const close = result === 'loss' ? ' Voyons où elle s’est jouée.' : '';
    return `${opening[result]} Vous avez joué avec ${accuracy} de précision.${close}`;
  },
  failed: 'Je n’ai pas pu analyser la partie ici : le Bilan vous montrera tout.',
  review: 'Bilan de la partie',
  close: 'Fermer',
  anonymous: 'Anonyme',
  // French counts 0 and 1 as singular.
  countLabel: (moveClass, count) => FR_COUNTS[moveClass][count > 1 ? 1 : 0],
  quotes: {
    loss: [
      {
        text: 'Vous apprendrez bien plus d’une partie perdue que d’une partie gagnée.',
        author: CAPABLANCA,
      },
      { text: 'Le vainqueur est celui qui commet l’avant-dernière erreur.', author: TARTAKOWER },
      { text: 'Je préfère perdre une belle partie que gagner une mauvaise.', author: 'David Levy' },
      { text: 'Tout maître d’échecs a d’abord été un débutant.', author: 'Irving Chernev' },
      { text: 'Les échecs sont un conte des mille et une gaffes.', author: TARTAKOWER },
    ],
    draw: [
      { text: 'La partie la plus difficile à gagner est une partie gagnée.', author: LASKER },
      { text: 'Quand vous voyez un bon coup, cherchez-en un meilleur.', author: LASKER },
      {
        text: 'Les échecs sont tout : un art, une science et un sport.',
        author: 'Anatoli Karpov',
      },
    ],
  },
};

const en: GameOverTexts = {
  title: (result, opponent) =>
    ({ win: `You beat ${opponent}!`, loss: 'You lost', draw: 'Draw' })[result],
  results: { win: 'Victory', loss: 'Defeat', draw: 'Draw' },
  accuracy: 'accuracy',
  reasons: {
    mate: 'by checkmate',
    resign: 'by resignation',
    time: 'on time',
    left: 'by abandonment',
    stalemate: 'by stalemate',
    draw: '',
    other: '',
  },
  winner: 'Winner',
  kingLabels: {
    mate: 'Checkmate',
    resign: 'Resigned',
    time: 'Time out',
    left: 'Abandoned',
    stalemate: 'Stalemate',
    draw: 'Draw',
    other: 'Lost',
  },
  drawLabel: 'Draw',
  analysing: 'One moment while your Game Review loads…',
  verdict: (result, accuracy) => {
    const opening = { win: 'Well played!', loss: 'Not this time!', draw: 'A close game!' };
    if (accuracy === null) return `${opening[result]} Let’s look at the game together.`;
    const close = result === 'loss' ? ' Let’s see where it turned.' : '';
    return `${opening[result]} You played with ${accuracy} accuracy.${close}`;
  },
  failed: 'I couldn’t analyse the game here: Game Review will show you everything.',
  review: 'Game Review',
  close: 'Close',
  anonymous: 'Anonymous',
  countLabel: (moveClass, count) => EN_COUNTS[moveClass][count === 1 ? 0 : 1],
  quotes: {
    loss: [
      {
        text: 'You may learn much more from a game you lose than from a game you win.',
        author: CAPABLANCA,
      },
      {
        text: 'The winner of the game is the player who makes the next-to-last mistake.',
        author: TARTAKOWER,
      },
      { text: 'I prefer to lose a really good game than to win a bad one.', author: 'David Levy' },
      { text: 'Every chess master was once a beginner.', author: 'Irving Chernev' },
      { text: 'Chess is a fairy tale of 1001 blunders.', author: TARTAKOWER },
    ],
    draw: [
      { text: 'The hardest game to win is a won game.', author: LASKER },
      { text: 'When you see a good move, look for a better one.', author: LASKER },
      { text: 'Chess is everything: art, science and sport.', author: 'Anatoly Karpov' },
    ],
  },
};

export const gameOverTexts = (): GameOverTexts => (isFrench() ? fr : en);

/** An accuracy of 0 to 100 as the page's language writes a percentage: "87,3 %", "87.3%". */
// Rounded to the tenth as the review rounds it (toFixed), so that both show 88.8
// for 88.85, where Intl alone would say 88.9.
export const formatAccuracy = (accuracy: number): string =>
  new Intl.NumberFormat(pageLocale(), { style: 'percent', maximumFractionDigits: 1 }).format(
    Number(accuracy.toFixed(1)) / 100,
  );
