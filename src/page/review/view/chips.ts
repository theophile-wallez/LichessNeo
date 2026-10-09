import { closestTo } from '#shared/dom.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { parentPath } from '#page/lichess/tree.ts';
import type { Session } from '#page/review/session.ts';
import { arrow } from './board-badge.ts';
import { goTo, lineShown } from './navigation.ts';

// The moves in the coach's text (comment/markup.ts): pointing at one draws its
// arrow on the board, clicking plays it as a variation, from the position
// before the move the coach speaks of, or after it.

const CHIP = '.lr-ext-mv--play';

const ucisOf = (chip: HTMLElement): string[] =>
  (chip.dataset.lrExtUcis ?? '').split(',').filter(uci => uci.length >= 4);

/** The path of the move the coach speaks of: the one on the board, or the one Explain's line stands for. */
const spokenPath = (session: Session, analysis: Analysis): string =>
  lineShown(session, analysis)?.path ?? analysis.path;

export function playChip(session: Session, analysis: Analysis, chip: HTMLElement): void {
  const ucis = ucisOf(chip);
  if (ucis.length === 0 || !analysis.canPlayUci) return;
  const path = spokenPath(session, analysis);
  session.view.hover = null;
  goTo(analysis, chip.dataset.lrExtBase === 'a' ? path : parentPath(path));
  for (const uci of ucis) analysis.playUci(uci);
  analysis.redraw();
}

function onPointer(session: Session, event: PointerEvent): void {
  const chip = closestTo(event.target, CHIP, HTMLElement);
  const last = chip ? ucisOf(chip).at(-1) : undefined;
  const hover =
    last && chip
      ? (arrow(last, chip.dataset.lrExtBase === 'a' ? 'threat' : 'best')[0] ?? null)
      : null;
  const { view } = session;
  if (JSON.stringify(hover) === JSON.stringify(view.hover)) return;
  view.hover = hover;
  session.redraw();
}

export function watchChips(session: Session): void {
  const { panel } = session.elements;
  panel.addEventListener('pointerover', event => onPointer(session, event), { passive: true });
  panel.addEventListener('pointerleave', event => onPointer(session, event), { passive: true });
}
