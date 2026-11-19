import { STUDIES } from '#page/review/theory/book.ts';
import type { TheorySentences } from './theory-types.ts';

const either = new Intl.ListFormat('fr', { type: 'disjunction' });
const percent = new Intl.NumberFormat('fr', { style: 'percent', maximumFractionDigits: 0 });

export const theoryFr: TheorySentences = {
  study: STUDIES.fr,
  next: moves => [`La théorie continue avec ${either.format(moves)}.`],
  left: moves => [
    `On quitte la théorie, qui joue ici ${either.format(moves)}.`,
    `Fin de la théorie : ici, on joue d’habitude ${either.format(moves)}.`,
  ],
  punish: moves => [
    `La punition : ${either.format(moves)}.`,
    `On y répond par ${either.format(moves)}.`,
  ],
  common: (share, rated) =>
    rated
      ? [
          `Une erreur classique : ${percent.format(share)} des joueurs de ce niveau la jouent ici.`,
          `Tu n’es pas seul : ${percent.format(share)} des joueurs de ce niveau se trompent de la même façon ici.`,
        ]
      : [`Une erreur classique : ${percent.format(share)} des joueurs de Lichess la jouent ici.`],
};
