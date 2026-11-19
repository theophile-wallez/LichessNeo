import { z } from 'zod/mini';
import { type Drawing, drawn } from '#page/review/coach/said.ts';
import { positionKey, type StudyMove, type StudyPosition, studyPositions } from './study.ts';
import { studyText } from './study-text.ts';
import data from './studies.json' with { type: 'json' };

// The coach's opening theory, read from its study (study.ts) once a page shows
// a move of the opening: never on the pages that don't, nor twice on one. The
// browser keeps the export, and Lichess's Last-Modified makes a second read a 304.

/** The studies' ids, by language. */
export const STUDIES = z.object({ en: z.string(), fr: z.string() }).parse(data);

export type TheoryMove = StudyMove;

export interface TheoryEntry {
  /** What the coach explains of the position, its moves and squares as tokens. */
  readonly text: string;
  readonly next: readonly TheoryMove[];
  /** The move that reaches the position is a mistake: the text says why, `next` how it's punished. */
  readonly mistake: boolean;
  /** What the study draws there, the coach's plans. */
  readonly drawing: Drawing | null;
}

let positions: ReadonlyMap<string, StudyPosition> = new Map();
let asked: string | null = null;
let retryAt = 0;
const entries = new Map<string, TheoryEntry>();

/** After a failed read, the next waits this long: the page renders every 150 ms. */
export const RETRY_MS = 30_000;

const exportUrl = (study: string): string =>
  `/api/study/${study}.pgn?comments=true&variations=true&clocks=false&orientation=false`;

async function read(study: string, loaded: () => void): Promise<void> {
  try {
    const response = await fetch(exportUrl(study));
    if (!response.ok) throw new Error(`${response.status}`);
    const text = await response.text();
    // The language changed meanwhile: the other study's theory is on its way.
    if (asked !== study) return;
    positions = studyPositions(text);
    entries.clear();
    // A study with no theory changes nothing on show.
    if (positions.size > 0) loaded();
  } catch (error) {
    // Asked again later: a page that went offline a moment keeps its theory.
    if (asked === study) {
      asked = null;
      retryAt = Date.now() + RETRY_MS;
    }
    console.error('[LichessNeo] the opening theory is out of reach', error);
  }
}

/** Reads the study `study` once, and calls `loaded` when its theory is in. */
export function loadTheory(study: string, loaded: () => void): void {
  if (asked === study || Date.now() < retryAt) return;
  asked = study;
  // Another language's theory isn't this one's, even until it's in.
  positions = new Map();
  entries.clear();
  void read(study, loaded);
}

/** Takes `pgn` as the study `study`'s export, at once: the site's snapshot, which asks no one. */
export function takeTheory(study: string, pgn: string): void {
  if (asked === study) return;
  asked = study;
  positions = studyPositions(pgn);
  entries.clear();
}

/** The theory of the position `fen`, or null when the study has none (or isn't read yet). */
export function theoryAt(fen: string): TheoryEntry | null {
  const key = positionKey(fen);
  const known = entries.get(key);
  if (known) return known;
  const position = positions.get(key);
  if (!position) return null;
  const entry = {
    text: studyText(position),
    next: position.next,
    mistake: position.mistake,
    drawing: drawn('plans', position.marks),
  };
  entries.set(key, entry);
  return entry;
}
