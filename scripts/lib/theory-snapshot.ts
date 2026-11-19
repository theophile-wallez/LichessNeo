import type { Mark, MarkTone } from '#shared/board/marks.ts';
import { positionKey, type StudyPosition } from '#page/review/theory/study.ts';

// The site's snapshot of the coach's opening theory (site/demo/theory.json):
// the positions of the demo's game that a study comments, each as a game of
// its own, its moves bare up to it, its comment, then its theory's moves. The
// review reads it as it reads the study (theory/study.ts), with no request.

const BRUSHES: Readonly<Record<MarkTone, string>> = { defense: 'G', attack: 'R', plan: 'Y' };

/** The shapes the coach draws there, as Lichess writes them: [%csl Gd5][%cal Ge2e4]. */
function shapeCommands(marks: readonly Mark[]): string {
  const squares: string[] = [];
  const arrows: string[] = [];
  for (const mark of marks) {
    if (mark.kind === 'ring') squares.push(`${BRUSHES[mark.tone]}${mark.square}`);
    if (mark.kind === 'link') arrows.push(`${BRUSHES[mark.tone]}${mark.from}${mark.to}`);
  }
  return [
    squares.length > 0 ? `[%csl ${squares.join(',')}]` : '',
    arrows.length > 0 ? `[%cal ${arrows.join(',')}]` : '',
  ].join('');
}

const numbered = (ply: number, san: string, always: boolean): string => {
  const number = Math.floor(ply / 2) + 1;
  if (ply % 2 === 0) return `${number}. ${san}`;
  return always ? `${number}... ${san}` : san;
};

/** One position, as a game: its line, its mark and comment, its theory's moves after it. */
export function positionGame(position: StudyPosition): string {
  const { line, next } = position;
  const moves = line.map((move, ply) => numbered(ply, move.san, false));
  const comment = [position.comment, shapeCommands(position.marks)].filter(Boolean).join(' ');
  const [main, ...others] = next.map(move => numbered(line.length, move.san, true));
  const after = main ? [main, ...others.map(other => `( ${other} )`)] : [];
  return [
    `[Event "${line.map(move => move.san).join(' ')}"]`,
    '',
    [...moves, ...(position.mistake ? ['$2'] : []), `{ ${comment} }`, ...after, '*'].join(' '),
  ].join('\n');
}

/** The study's positions along the game's `fens`, as a PGN of their own. */
export function theorySnapshot(
  positions: ReadonlyMap<string, StudyPosition>,
  fens: readonly string[],
): string {
  return fens
    .flatMap(fen => {
      const position = positions.get(positionKey(fen));
      return position ? [positionGame(position)] : [];
    })
    .join('\n\n');
}
