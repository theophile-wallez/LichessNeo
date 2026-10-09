import type { CardSpeed } from './pools.ts';

// The speed cards' words, in the languages the home's hero speaks
// (hero-texts.ts); English otherwise. The heading is Lichess's own: its quick
// pairing tab's name.

export interface SpeedTexts {
  readonly names: Readonly<Record<CardSpeed, string>>;
  readonly games: (count: number) => string;
  readonly provisional: string;
  readonly custom: string;
}

const ENGLISH: SpeedTexts = {
  names: { bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapid', classical: 'Classical' },
  games: count => (count === 1 ? '1 game' : `${count} games`),
  provisional: 'provisional',
  custom: 'Custom game',
};

const TEXTS: Readonly<Record<string, SpeedTexts>> = {
  en: ENGLISH,
  fr: {
    names: { bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapide', classical: 'Classique' },
    games: count => (count <= 1 ? `${count} partie` : `${count} parties`),
    provisional: 'provisoire',
    custom: 'Partie personnalisée',
  },
  de: {
    names: { bullet: 'Bullet', blitz: 'Blitz', rapid: 'Schnellschach', classical: 'Klassisch' },
    games: count => (count === 1 ? '1 Partie' : `${count} Partien`),
    provisional: 'vorläufig',
    custom: 'Eigene Partie',
  },
  es: {
    names: { bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rápida', classical: 'Clásica' },
    games: count => (count === 1 ? '1 partida' : `${count} partidas`),
    provisional: 'provisional',
    custom: 'Partida personalizada',
  },
  pt: {
    names: { bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rápida', classical: 'Clássico' },
    games: count => (count === 1 ? '1 partida' : `${count} partidas`),
    provisional: 'provisório',
    custom: 'Partida personalizada',
  },
};

/** The cards' words for a page language (`fr`, `pt-BR`…). */
export const speedTexts = (lang: string): SpeedTexts => TEXTS[lang.slice(0, 2)] ?? ENGLISH;
