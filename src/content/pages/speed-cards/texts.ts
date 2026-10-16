import type { CardSpeed } from './pools.ts';

// The speed cards' words, in the languages the home's hero speaks
// (hero-texts.ts); English otherwise. The heading is Lichess's own: its quick
// pairing tab's name.

export interface SpeedTexts {
  readonly names: Readonly<Record<CardSpeed, string>>;
  readonly games: (count: number) => string;
  readonly provisional: string;
  readonly custom: string;
  /** While Lichess seeks a game in a pool, its label given. */
  readonly seeking: (pool: string) => string;
  readonly cancel: string;
  /** The hero's first button, a game in a pool, its label given. */
  readonly play: (pool: string) => string;
}

const ENGLISH: SpeedTexts = {
  names: { bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapid', classical: 'Classical' },
  games: count => (count === 1 ? '1 game' : `${count} games`),
  provisional: 'provisional',
  custom: 'Custom game',
  seeking: pool => `Looking for a ${pool} opponent…`,
  cancel: 'Cancel',
  play: pool => `Play a ${pool} game`,
};

const TEXTS: Readonly<Record<string, SpeedTexts>> = {
  en: ENGLISH,
  fr: {
    names: { bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapide', classical: 'Classique' },
    games: count => (count <= 1 ? `${count} partie` : `${count} parties`),
    provisional: 'provisoire',
    custom: 'Partie personnalisée',
    seeking: pool => `Recherche d’un adversaire en ${pool}…`,
    cancel: 'Annuler',
    play: pool => `Jouer une partie ${pool}`,
  },
  de: {
    names: { bullet: 'Bullet', blitz: 'Blitz', rapid: 'Schnellschach', classical: 'Klassisch' },
    games: count => (count === 1 ? '1 Partie' : `${count} Partien`),
    provisional: 'vorläufig',
    custom: 'Eigene Partie',
    seeking: pool => `Suche nach einem Gegner (${pool})…`,
    cancel: 'Abbrechen',
    play: pool => `Partie ${pool} spielen`,
  },
  es: {
    names: { bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rápida', classical: 'Clásica' },
    games: count => (count === 1 ? '1 partida' : `${count} partidas`),
    provisional: 'provisional',
    custom: 'Partida personalizada',
    seeking: pool => `Buscando rival (${pool})…`,
    cancel: 'Cancelar',
    play: pool => `Jugar una partida ${pool}`,
  },
  pt: {
    names: { bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rápida', classical: 'Clássico' },
    games: count => (count === 1 ? '1 partida' : `${count} partidas`),
    provisional: 'provisório',
    custom: 'Partida personalizada',
    seeking: pool => `Procurando adversário (${pool})…`,
    cancel: 'Cancelar',
    play: pool => `Jogar uma partida ${pool}`,
  },
};

/** The cards' words for a page language (`fr`, `pt-BR`…). */
export const speedTexts = (lang: string): SpeedTexts => TEXTS[lang.slice(0, 2)] ?? ENGLISH;
