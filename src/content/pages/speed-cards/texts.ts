import type { SeekPerf } from '#shared/custom-seek.ts';

// The speed cards' words, in the languages the home's hero speaks
// (hero-texts.ts); English otherwise. The heading is Lichess's own: its quick
// pairing tab's name.

export interface SpeedTexts {
  /** A card's name: its speed's, or its variant's. */
  readonly names: Readonly<Record<SeekPerf, string>>;
  /** A card's game that isn't rated. */
  readonly casual: string;
  readonly games: (count: number) => string;
  readonly provisional: string;
  readonly custom: string;
  /** The link to the settings' page of the cards. */
  readonly edit: string;
  /** While Lichess seeks a game in a pool, its label given. */
  readonly seeking: (pool: string) => string;
  readonly cancel: string;
  /** The hero's first button, a game in a pool, its label given. */
  readonly play: (pool: string) => string;
}

// Most languages keep the variants' English names, as Lichess does.
const VARIANT_NAMES = {
  chess960: 'Chess960',
  crazyhouse: 'Crazyhouse',
  kingOfTheHill: 'King of the Hill',
  threeCheck: 'Three-check',
  antichess: 'Antichess',
  atomic: 'Atomic',
  horde: 'Horde',
  racingKings: 'Racing Kings',
};

const ENGLISH: SpeedTexts = {
  names: {
    ultraBullet: 'UltraBullet',
    bullet: 'Bullet',
    blitz: 'Blitz',
    rapid: 'Rapid',
    classical: 'Classical',
    ...VARIANT_NAMES,
  },
  casual: 'Casual',
  games: count => (count === 1 ? '1 game' : `${count} games`),
  provisional: 'provisional',
  custom: 'Custom game',
  edit: 'Edit',
  seeking: pool => `Looking for an opponent (${pool})…`,
  cancel: 'Cancel',
  play: pool => `Play a ${pool} game`,
};

const TEXTS: Readonly<Record<string, SpeedTexts>> = {
  en: ENGLISH,
  fr: {
    names: {
      ultraBullet: 'UltraBullet',
      bullet: 'Bullet',
      blitz: 'Blitz',
      rapid: 'Rapide',
      classical: 'Classique',
      ...VARIANT_NAMES,
      kingOfTheHill: 'Roi de la colline',
      threeCheck: 'Trois échecs',
      antichess: 'Qui perd gagne',
      atomic: 'Atomique',
      racingKings: 'Course de rois',
    },
    casual: 'Amicale',
    games: count => (count <= 1 ? `${count} partie` : `${count} parties`),
    provisional: 'provisoire',
    custom: 'Partie personnalisée',
    edit: 'Modifier',
    seeking: pool => `Recherche d’un adversaire en ${pool}…`,
    cancel: 'Annuler',
    play: pool => `Jouer une partie ${pool}`,
  },
  de: {
    names: {
      ultraBullet: 'UltraBullet',
      bullet: 'Bullet',
      blitz: 'Blitz',
      rapid: 'Schnellschach',
      classical: 'Klassisch',
      ...VARIANT_NAMES,
    },
    casual: 'Ungewertet',
    games: count => (count === 1 ? '1 Partie' : `${count} Partien`),
    provisional: 'vorläufig',
    custom: 'Eigene Partie',
    edit: 'Bearbeiten',
    seeking: pool => `Suche nach einem Gegner (${pool})…`,
    cancel: 'Abbrechen',
    play: pool => `Partie ${pool} spielen`,
  },
  es: {
    names: {
      ultraBullet: 'UltraBullet',
      bullet: 'Bullet',
      blitz: 'Blitz',
      rapid: 'Rápida',
      classical: 'Clásica',
      ...VARIANT_NAMES,
    },
    casual: 'Amistosa',
    games: count => (count === 1 ? '1 partida' : `${count} partidas`),
    provisional: 'provisional',
    custom: 'Partida personalizada',
    edit: 'Editar',
    seeking: pool => `Buscando rival (${pool})…`,
    cancel: 'Cancelar',
    play: pool => `Jugar una partida ${pool}`,
  },
  pt: {
    names: {
      ultraBullet: 'UltraBullet',
      bullet: 'Bullet',
      blitz: 'Blitz',
      rapid: 'Rápida',
      classical: 'Clássico',
      ...VARIANT_NAMES,
    },
    casual: 'Casual',
    games: count => (count === 1 ? '1 partida' : `${count} partidas`),
    provisional: 'provisório',
    custom: 'Partida personalizada',
    edit: 'Editar',
    seeking: pool => `Procurando adversário (${pool})…`,
    cancel: 'Cancelar',
    play: pool => `Jogar uma partida ${pool}`,
  },
};

/** The cards' words for a page language (`fr`, `pt-BR`…). */
export const speedTexts = (lang: string): SpeedTexts => TEXTS[lang.slice(0, 2)] ?? ENGLISH;
