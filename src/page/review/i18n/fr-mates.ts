import type { MatePattern } from '#page/review/coach/mate-pattern.ts';

// The named mates in French, each with what makes it: said after the mate.

export const MATES_FR: Readonly<Record<MatePattern, string>> = {
  backRank: 'Un mat du couloir : les pions du roi l’enferment.',
  smothered: 'Un mat à l’étouffée : le roi est enseveli sous ses propres pièces.',
  arabian: 'Le mat arabe : la tour à côté du roi dans le coin, tenue par le cavalier.',
  epaulette: 'Un mat des épaulettes : les pièces du roi, de chaque côté, lui barrent la route.',
  corner:
    'Un mat du coin : le roi coincé dans l’angle, une tour tient la colonne, le cavalier donne l’échec.',
  suffocation: 'Un mat par suffocation : les pièces du roi l’emmurent, un fou couvre le reste.',
  boden: 'Le mat de Boden : deux fous sur des diagonales croisées.',
  doubleBishop: 'Un mat des deux fous : côte à côte, ils balaient le roi.',
  morphy:
    'Le mat de Morphy : le fou fait échec au roi dans le coin, une tour tient la colonne voisine.',
  reti: 'Le mat de Réti : le fou fait échec collé au roi, emmuré par ses propres pièces, une tour ou la dame derrière lui.',
  balestra:
    'Le mat Balestra : le fou fait échec de loin, la dame, à un saut de cavalier, couvre le reste.',
  blackburne: 'Le mat de Blackburne : deux fous et un cavalier referment le filet.',
  legal: 'Le mat de Légal : deux cavaliers et un fou, et le roi est pris.',
  pawn: 'Mat par un pion : la plus humble des pièces a le dernier mot.',
  anastasia:
    'Le mat d’Anastasia : le cavalier et la propre pièce du roi l’enferment sur le bord, et l’échec descend la colonne.',
  greco:
    'Le mat de Greco : le roi dans le coin, un fou contrôle la case voisine, l’échec descend la colonne du bord.',
  pillsbury:
    'Le mat de Pillsbury : l’échec sur la colonne du roi, un fou sur la grande diagonale couvre le coin.',
  hook: 'Un mat du crochet : la tour à côté du roi, tenue par un cavalier, lui-même tenu par un pion.',
  vukovic:
    'Le mat de Vukovic : la tour à côté du roi sur le bord, un cavalier couvre les cases le long du bord.',
  anderssen:
    'Le mat d’Anderssen : la tour fait échec depuis le coin, le long de la dernière rangée, protégée en diagonale par un pion ou un fou.',
  opera: 'Le mat de l’Opéra : la tour sur la dernière rangée, le fou la protège.',
  blindSwine:
    'Le mat des cochons aveugles : deux tours sur la septième, et le roi n’a plus de case.',
  killBox:
    'Un mat de la boîte : la tour à côté du roi, la dame la tient depuis l’autre coin de la boîte.',
  swallowsTail:
    'Le mat du guéridon : la dame face au roi, ses propres pièces lui bloquent le repli.',
  dovetail:
    'Un mat de la queue d’aronde : la dame en diagonale contre le roi, ses propres pièces lui barrent le reste.',
  triangle: 'Un mat du triangle : la dame à côté du roi, la tour la tient, les trois en triangle.',
  damiano: 'Le mat de Damiano : la dame se pose à côté du roi, et un pion la tient.',
  lolli: 'Le mat de Lolli : la dame juste devant le roi, tenue par un pion.',
  maxLange: 'Le mat de Max Lange : la dame à côté du roi, le fou la protège.',
  ladder:
    'Un mat de l’escalier : deux pièces lourdes, l’une sur le bord, l’autre sur la ligne voisine.',
  scholar: 'Le coup du berger : la dame prend la case faible à côté du roi, le fou la protège.',
  kissOfDeath: 'Le baiser de la mort : la dame collée au roi, protégée par son propre roi.',
};
