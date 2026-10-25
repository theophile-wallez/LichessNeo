import { queryOne } from '#shared/dom.ts';

// Whether the puzzle on show was solved first time, read from its chip in the
// session: Lichess's end card says "Success!" even after a mistake, once the
// last move is found.

export type Verdict = 'solved' | 'failed';

/** The current puzzle's verdict, or null while its session chip has none (or there is no session). */
export function readVerdict(root: ParentNode): Verdict | null {
  const chip = queryOne(root, '.puzzle__session .current', HTMLElement);
  if (chip?.classList.contains('result-true')) return 'solved';
  if (chip?.classList.contains('result-false')) return 'failed';
  return null;
}
