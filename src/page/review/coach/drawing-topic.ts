import type { DrawingTopic } from '#shared/coach-drawings.ts';
import type { Reason } from './idea.ts';
import type { Theme } from './said.ts';

// Which of the settings' kinds of drawing a fact's drawing is, by the tactic
// it's about or the reason it draws.

export const THEME_TOPICS: Readonly<Record<Theme, DrawingTopic>> = {
  fork: 'forks',
  pin: 'pins',
  skewer: 'pins',
  discovered: 'lines',
  doubleCheck: 'checks',
  defender: 'hanging',
  trapped: 'hanging',
  hanging: 'hanging',
  xray: 'lines',
  attraction: 'lines',
  interference: 'lines',
  clearance: 'lines',
  mate: 'mates',
  sacrifice: 'mates',
};

const REASON_TOPICS: Partial<Readonly<Record<Reason['kind'], DrawingTopic>>> = {
  fork: 'forks',
  doubleThreat: 'forks',
  pins: 'pins',
  hitsPinned: 'pins',
  discovery: 'lines',
  discoveredCheck: 'checks',
  checks: 'checks',
  chases: 'threats',
  attacksPawn: 'threats',
  saves: 'threats',
  guards: 'threats',
  backs: 'threats',
  takes: 'threats',
  attacksKing: 'threats',
  passedPawn: 'pawns',
  behindPasser: 'pawns',
  blocksPasser: 'pawns',
  outruns: 'pawns',
  entersSquare: 'pawns',
  escorts: 'pawns',
  stopsPasser: 'pawns',
  opposition: 'endings',
  distantOpposition: 'endings',
  keySquare: 'endings',
  cornerDraw: 'endings',
  bridge: 'endings',
  vancura: 'endings',
};

/** The kind of drawing of `reason`'s marks: a tactic, a threat, a pawn's road, an ending's rule, else a plan. */
export function reasonTopic(reason: Reason | null): DrawingTopic {
  if (!reason) return 'plans';
  if (reason.kind === 'both') return reasonTopic(reason.first);
  return REASON_TOPICS[reason.kind] ?? 'plans';
}
