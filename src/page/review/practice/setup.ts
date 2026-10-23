import type { Color } from '#shared/chess/types.ts';
import type { GameDrill } from './games.ts';
import type { OpeningLine } from './openings.ts';
import type { Quiz } from './quiz.ts';
import { type PracticeSettings, readSettings } from './settings.ts';
import type { StudyMeta } from './study-api.ts';
import type { StudyChapter } from './studies.ts';

// What the practice page holds before a line starts: the side the user picked,
// their search of Lichess's openings, how the lines go, which of its pages
// shows, and what those pages have fetched.

/** The page's own pages: its home, the traps' choice of an opening, the user's games, their repertoire. */
export type OpeningsView = 'home' | 'traps' | 'games' | 'repertoire';

/** Something fetched for a page: not yet, on its way, failed, or in. */
export type Fetched<T> =
  | { readonly state: 'idle' | 'loading' | 'failed' }
  | { readonly state: 'done'; readonly value: T };

export interface OpeningsSetup {
  side: Color;
  /** The search, as typed. */
  query: string;
  /** What Lichess found for `query`; null before any search. */
  results: readonly OpeningLine[] | null;
  searching: boolean;
  searchFailed: boolean;
  /** How the lines go, kept for the next visit; practice reads them as they change. */
  readonly settings: PracticeSettings;
  /** Their choices show, rather than the line that sums them up. */
  settingsOpen: boolean;
  view: OpeningsView;
  /** The repertoire's page shows the user's lines, or their studies. */
  tab: 'mine' | 'studies';
  /** The repertoire's rows unfolded, by their moves. */
  readonly unfolded: Set<string>;
  /** The branch whose removal waits for a second click, as `from|move`. */
  pruning: string | null;
  /** The opening whose traps are on their way, and how the last fetch went. */
  traps: { opening: string; state: 'loading' | 'failed' | 'none' } | null;
  games: Fetched<readonly GameDrill[]>;
  studies: Fetched<readonly StudyMeta[]>;
  /** The study unfolded on the repertoire's page, and its chapters once read. */
  study: { readonly id: string; chapters: Fetched<readonly StudyChapter[]> } | null;
  quiz: Quiz | null;
}

export const freshSetup = (): OpeningsSetup => ({
  side: 'white',
  query: '',
  results: null,
  searching: false,
  searchFailed: false,
  settings: readSettings(),
  settingsOpen: false,
  view: 'home',
  tab: 'mine',
  unfolded: new Set(),
  pruning: null,
  traps: null,
  games: { state: 'idle' },
  studies: { state: 'idle' },
  study: null,
  quiz: null,
});
