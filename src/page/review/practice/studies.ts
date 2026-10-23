import { START_PLACEMENT } from '#shared/chess/fen.ts';
import type { Color } from '#shared/chess/types.ts';
import { parsePgn, type PgnTree } from './pgn-tree.ts';
import { exportStudy } from './study-api.ts';

// The user's own studies as books to practice: each chapter from the standard
// start with moves is one, its main line the moves to find, its variations the
// replies to meet, played as the side its board is turned to.

export interface StudyChapter {
  readonly id: string;
  readonly name: string;
  readonly side: Color;
  readonly tree: PgnTree;
  /** Its positions, a move of its tree each. */
  readonly moves: number;
}

const countMoves = (tree: PgnTree): number =>
  tree.children.reduce((sum, child) => sum + 1 + countMoves(child), 0);

/** The chapters of a study's export that practice can play. */
export function studyChapters(pgn: string): StudyChapter[] {
  return parsePgn(pgn).flatMap(({ tags, tree }) => {
    const fen = tags.get('FEN');
    const moves = countMoves(tree);
    if ((fen && !fen.startsWith(`${START_PLACEMENT} w`)) || moves === 0) return [];
    const id = tags.get('ChapterURL')?.split('/').at(-1) ?? '';
    const name = tags.get('ChapterName') ?? tags.get('Event') ?? '';
    const side: Color = tags.get('Orientation') === 'black' ? 'black' : 'white';
    return [{ id, name, side, tree, moves }];
  });
}

/** A study's chapters, read once a visit. */
const read = new Map<string, Promise<StudyChapter[]>>();

export function chaptersOf(id: string): Promise<StudyChapter[]> {
  const known = read.get(id);
  if (known) return known;
  const asked = exportStudy(id).then(studyChapters);
  read.set(id, asked);
  // A failure is asked again next time.
  void asked.catch(() => read.delete(id));
  return asked;
}
