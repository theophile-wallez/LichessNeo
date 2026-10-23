import type { Analysis } from '#page/lichess/analysis.ts';
import type { ExplorerSource } from '#page/lichess/explorer.ts';
import type { BookSource } from '#page/review/i18n/practice-types.ts';
import { judgeAt } from '#page/review/live/judging.ts';
import type { PracticeState } from '#page/review/practice/state.ts';
import type { JudgedMove, Session } from '#page/review/session.ts';

// What the coach's words on practice speak from: the session, the board, the
// line, and whose games its book is.

export interface Spoken {
  readonly session: Session;
  readonly analysis: Analysis;
  readonly practice: PracticeState;
  readonly source: BookSource;
}

/** Whose games the book is, as the coach names them: "your games" for the user's own. */
export function bookSource(source: ExplorerSource | null): BookSource {
  if (source?.db !== 'player') return { db: source?.db ?? 'masters' };
  const me = document.body.dataset.user?.toLowerCase() ?? '';
  return {
    db: 'player',
    player: source.player,
    you: me !== '' && source.player.toLowerCase() === me,
  };
}

/** The engine's verdict on the move to `path`, once it has one. */
export const judged = ({ session, analysis }: Spoken, path: string): JudgedMove | null =>
  judgeAt(session.live, analysis, path);
