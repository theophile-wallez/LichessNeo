import type { EngineKind, TierId } from './options.ts';

// The engine's settings in words, for the review's popover (in the page's
// language) and the settings' card (in the extension's).

export interface EngineWords {
  readonly locale: string;
  readonly title: string;
  readonly group: string;
  readonly tiers: Readonly<Record<TierId, string>>;
  readonly depth: string;
  readonly reset: string;
  readonly resetAll: string;
  readonly forThisGame: string;
  readonly forAGame: string;
  readonly hint: string;
  /** The default depth's mark on the popover's curve. */
  readonly byDefault: string;
  /** The curves' legend: each engine by its name. */
  readonly engineNames: Readonly<Record<EngineKind, string>>;
  readonly engine: string;
  readonly engineBody: string;
  readonly kinds: Readonly<Record<EngineKind, string>>;
  readonly kindNames: Readonly<Record<EngineKind, string>>;
  readonly kindNotes: Readonly<Record<EngineKind, string>>;
  readonly speed: string;
  readonly accuracy: string;
  readonly memory: string;
  readonly cores: string;
  readonly coresBody: string;
  readonly coresWarning: string;
  readonly advanced: string;
  readonly threads: string;
  readonly threadsWhy: string;
  readonly hash: string;
  readonly hashWhy: string;
  readonly cap: string;
  readonly capNone: string;
  readonly upToDate: string;
  readonly keptDeeper: string;
  readonly less: string;
  readonly more: string;
  readonly deeper: string;
  readonly shallower: string;
  readonly pastCurve: string;
  readonly analysedAs: (depth: number, kind: string) => string;
  readonly layout: (engines: number, threads: number) => string;
  readonly suggested: (cores: number, of: number) => string;
  readonly suggestion: (cores: number) => string;
  readonly device: (cores: number, gigabytes: number | null) => string;
  readonly coresMoved: (cores: number, engine: EngineKind) => string;
  readonly total: (layout: string, megabytes: number) => string;
  readonly megabytes: (value: number) => string;
  readonly reanalyse: (depth: number) => string;
  readonly reanalyseWith: (kind: string) => string;
  readonly running: (depth: number) => string;
  readonly shiftTo: (depth: number) => string;
  readonly left: (time: string, engines: number) => string;
  readonly states: Readonly<Record<'engine' | 'cloud' | 'busy', string>>;
}

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count > 1 ? many : one}`;

export const ENGLISH: EngineWords = {
  locale: 'en',
  title: 'Debrief analysis',
  group: 'Debrief engine',
  tiers: { fast: 'Fast', standard: 'Standard', deep: 'Deep', max: 'Maximum', custom: 'Custom' },
  depth: 'Depth',
  reset: 'Default',
  resetAll: 'Default settings',
  forThisGame: 'for this game',
  forAGame: 'A 40-move game',
  hint: 'The deeper, the sharper, and the longer',
  byDefault: 'Default',
  engineNames: { light: 'Light engine', full: 'Full engine' },
  engine: 'Engine',
  engineBody: 'Lichess’s Stockfish 19, with either network.',
  kinds: { light: 'Light', full: 'Full' },
  kindNames: { light: 'Stockfish 19 · 1 MB', full: 'Stockfish 19 · 94 MB' },
  kindNotes: {
    light: 'Fast, the one Lichess’s analysis runs. The verdicts are tuned on it.',
    full: 'Sharper at the same depth, 1.3 to 1.8 times slower. Downloaded once.',
  },
  speed: 'Speed',
  accuracy: 'Accuracy',
  memory: 'Memory',
  cores: 'Cores',
  coresBody: 'Each one searches a position at a time. One stays with the page.',
  coresWarning: 'Past the suggestion, the page may slow down during the analysis.',
  advanced: 'Advanced',
  threads: 'Threads per engine',
  threadsWhy:
    "Best left at 1. More threads don't make it faster here, they search wider: 0.87 s a position with 4 against 0.61 s with 1. And the same game could get different verdicts each time.",
  hash: 'Search memory (hash)',
  hashWhy:
    'Barely matters here: each position starts with fresh memory, so a game always gets the same verdicts. Above 16 MB, it just uses more RAM.',
  cap: 'Time limit per position',
  capNone: 'None',
  upToDate: 'This game is already analysed with these settings.',
  keptDeeper: 'The finer analysis already done is kept.',
  less: 'Fewer',
  more: 'More',
  deeper: 'Deeper',
  shallower: 'Shallower',
  pastCurve: 'Past 28, off the curve: a game can take hours.',
  analysedAs: (depth, kind) => `Analysed at depth ${depth} · ${kind.toLowerCase()}`,
  layout: (engines, threads) =>
    `${plural(engines, 'engine', 'engines')} × ${plural(threads, 'thread', 'threads')}`,
  suggested: (cores, of) => `Suggested: ${cores} of ${of}`,
  suggestion: cores => `Underlined: the suggestion, ${cores}`,
  device: (cores, gigabytes) =>
    `${cores} cores · ${gigabytes === null ? 'memory untold' : `${gigabytes} GB${gigabytes >= 8 ? ' or more' : ''}`}`,
  coresMoved: (cores, engine) =>
    `Now on ${cores} ${cores === 1 ? 'core' : 'cores'}, as the ${engine} engine needs ${engine === 'full' ? 'more' : 'less'} memory.`,
  total: (layout, megabytes) => `In all: ${layout} · about ${megabytes} MB of memory`,
  megabytes: value => `${value} MB`,
  reanalyse: depth => `Analyse again at depth ${depth}`,
  reanalyseWith: kind => `Analyse again with the ${kind.toLowerCase()} engine`,
  running: depth => `Analysing at depth ${depth}`,
  shiftTo: depth => `Analyse at depth ${depth} instead`,
  left: (time, engines) => `${time} left · ${plural(engines, 'engine', 'engines')}`,
  states: { engine: 'Engine', cloud: 'Cloud', busy: 'Analysing' },
};

export const FRENCH: EngineWords = {
  locale: 'fr',
  title: 'Analyse du Debrief',
  group: 'Moteur du Debrief',
  tiers: {
    fast: 'Rapide',
    standard: 'Standard',
    deep: 'Approfondi',
    max: 'Maximum',
    custom: 'Perso',
  },
  depth: 'Profondeur',
  reset: 'Par défaut',
  resetAll: 'Réglages par défaut',
  forThisGame: 'pour cette partie',
  forAGame: 'Une partie de 40 coups',
  hint: 'Plus c’est profond, plus c’est juste, et plus c’est long',
  byDefault: 'Par défaut',
  engineNames: { light: 'Moteur léger', full: 'Moteur complet' },
  engine: 'Moteur',
  engineBody: 'Le Stockfish 19 de Lichess, avec l’un ou l’autre réseau.',
  kinds: { light: 'Léger', full: 'Complet' },
  kindNames: { light: 'Stockfish 19 · 1 Mo', full: 'Stockfish 19 · 94 Mo' },
  kindNotes: {
    light: 'Rapide, celui de l’analyse de Lichess. Les verdicts sont réglés sur lui.',
    full: 'Plus juste à profondeur égale, 1,3 à 1,8 fois plus lent. Téléchargé une fois.',
  },
  speed: 'Vitesse',
  accuracy: 'Justesse',
  memory: 'Mémoire',
  cores: 'Cœurs',
  coresBody: 'Chacun analyse une position à la fois. Un reste à la page.',
  coresWarning: 'Au-delà de la suggestion, la page peut ralentir pendant l’analyse.',
  advanced: 'Avancé',
  threads: 'Threads par moteur',
  threadsWhy:
    'Mieux vaut laisser 1. Plus de threads ne vont pas plus vite ici, ils cherchent plus large : 0,87 s par position à 4 contre 0,61 s à 1. Et la même partie pourrait recevoir d’autres verdicts à chaque fois.',
  hash: 'Mémoire de recherche (hash)',
  hashWhy:
    'Ça ne change presque rien ici : chaque position repart d’une mémoire vide, pour que la même partie ait toujours les mêmes verdicts. Au-delà de 16 Mo, ça prend juste plus de RAM.',
  cap: 'Temps max par position',
  capNone: 'Aucun',
  upToDate: 'Cette partie est déjà analysée avec ces réglages.',
  keptDeeper: 'On garde l’analyse plus fine déjà faite.',
  less: 'Moins',
  more: 'Plus',
  deeper: 'Plus profond',
  shallower: 'Moins profond',
  pastCurve: 'Au-delà de 28, hors de la courbe : une partie peut prendre des heures.',
  analysedAs: (depth, kind) => `Analysée en profondeur ${depth} · ${kind.toLowerCase()}`,
  layout: (engines, threads) =>
    `${plural(engines, 'moteur', 'moteurs')} × ${plural(threads, 'thread', 'threads')}`,
  suggested: (cores, of) => `Suggéré : ${cores} sur ${of}`,
  suggestion: cores => `Souligné : la suggestion, ${cores}`,
  device: (cores, gigabytes) =>
    `${cores} cœurs · ${gigabytes === null ? 'mémoire inconnue' : `${gigabytes} Go${gigabytes >= 8 ? ' ou plus' : ''}`}`,
  coresMoved: (cores, engine) =>
    `Maintenant sur ${cores} ${cores === 1 ? 'cœur' : 'cœurs'}, car le moteur ${engine === 'full' ? 'complet demande plus' : 'léger demande moins'} de mémoire.`,
  total: (layout, megabytes) => `Au total : ${layout} · environ ${megabytes} Mo de mémoire`,
  megabytes: value => `${value} Mo`,
  reanalyse: depth => `Réanalyser en profondeur ${depth}`,
  reanalyseWith: kind => `Réanalyser avec le moteur ${kind.toLowerCase()}`,
  running: depth => `Analyse en profondeur ${depth}`,
  shiftTo: depth => `Analyser plutôt en profondeur ${depth}`,
  left: (time, engines) => `Encore ${time} · ${plural(engines, 'moteur', 'moteurs')}`,
  states: { engine: 'Moteur', cloud: 'Cloud', busy: 'En analyse' },
};

export const engineWords = (french: boolean): EngineWords => (french ? FRENCH : ENGLISH);
