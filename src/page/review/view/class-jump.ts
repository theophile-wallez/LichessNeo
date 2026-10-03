import { COLORS } from '#shared/chess/types.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { MOVE_CLASSES } from '#page/review/classes/classes.ts';
import { nextOfClass } from '#page/review/judge/summary.ts';
import type { Session } from '#page/review/session.ts';
import { jump } from './navigation.ts';

// The summary's counts are buttons: a click goes to the player's
// next move of that class after the one shown, round to the first again.

export function jumpToClass(session: Session, analysis: Analysis, button: HTMLElement): void {
  const { view } = session;
  const color = COLORS.find(each => each === button.dataset.cdcColor);
  const moveClass = MOVE_CLASSES.find(each => each === button.dataset.cdcClass);
  if (!view.review || !color || !moveClass) return;
  const move = nextOfClass(view.review.moves, { color, moveClass }, analysis.node.ply);
  if (!move) return;
  jump(analysis, move.ply);
  session.setMode('moves');
}
