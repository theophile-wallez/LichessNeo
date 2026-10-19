import { remarksFr } from './fr-remarks.ts';
import type { RemarkPools } from './types.ts';

// The remarks on the opponent's moves, for a reader who played the game: no
// cheering, no advice. Errors keep the reader's pools: the comment never
// remarks on one (coach/explanation.ts).

export const theirRemarksFr: RemarkPools = {
  ...remarksFr,
  brilliant: [
    'L’adversaire sacrifie du matériel, et ça marche.',
    'Un sacrifice audacieux de l’adversaire, et correct.',
    'Le genre de coup dont on se souvient.',
    'Peu de joueurs oseraient jouer ça.',
  ],
  great: [
    'L’adversaire trouve le seul bon coup.',
    'Le seul coup qui tient tout ensemble.',
    'Un moment critique, parfaitement négocié.',
    'Précis. Rien d’autre ne tenait ici.',
  ],
  best: [
    'Exactement ce que voulait le moteur.',
    'L’adversaire trouve le coup du moteur.',
    'Impossible de faire mieux.',
    'Dans le mille.',
    'C’est le coup le plus précis.',
    'Propre et précis.',
    'Du jeu précis de l’adversaire.',
    'Rien de mieux ici.',
    'Simple et fort.',
  ],
  excellent: [
    'Tout près du meilleur coup.',
    'Un coup fort, la position reste sous contrôle.',
    'Très bien. Le moteur chipote à peine.',
    'Presque parfait.',
    'Une suite sensée et solide.',
    'Du jeu solide de l’adversaire.',
  ],
  mate: [
    'Échec et mat ! La partie est finie.',
    'Et c’est mat : l’adversaire gagne.',
    'Le roi n’a plus de case. Mat !',
    'Échec et mat : la partie est terminée.',
  ],
  mating: [
    'Le filet de mat se resserre.',
    'L’adversaire resserre l’étau.',
    'Encore un pas vers le mat.',
    'Plus d’échappatoire pour le roi.',
  ],
  castle: [
    'Le roque : roi à l’abri, tour en jeu.',
    'L’adversaire met le roi à l’abri.',
    'Les tours vont pouvoir se connecter.',
    'Roque, et le roi est à l’abri.',
  ],
  check: [
    'Un échec qui garde l’initiative.',
    'Du jeu forcé : les échecs sont puissants.',
    'Échec : le roi doit répondre.',
    'Un échec pour garder la pression.',
  ],
  winning: [
    'L’adversaire a une position gagnante.',
    'La position de l’adversaire est gagnante.',
    'Il ne reste qu’à conclure pour l’adversaire.',
    'Ça gagne pour l’adversaire maintenant.',
  ],
  defending: [
    'La position de l’adversaire est difficile, mais la résistance continue.',
    'En difficulté, l’adversaire se défend encore.',
    'L’adversaire s’accroche.',
  ],
};
