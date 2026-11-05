import type { PlanSentences, Ways } from '#page/review/i18n/types.ts';
import { isPlain, type Plan } from './idea.ts';

// The ways to say each plan, in the language's sentences.

type PlanOf<K extends Plan['kind']> = Extract<Plan, { readonly kind: K }>;

// The plans of a set of kinds, told apart from the rest.
function ofKinds<K extends Plan['kind']>(kinds: readonly K[]) {
  const set: ReadonlySet<string> = new Set(kinds);
  return (plan: Plan): plan is PlanOf<K> => set.has(plan.kind);
}

const ENDGAME = [
  'escorts',
  'stopsPasser',
  'queenTrade',
  'passedPawn',
  'outruns',
  'entersSquare',
] as const;
const LINE = ['openFile', 'fileBattery', 'diagonalBattery', 'opensLine', 'discovery'] as const;

const SQUARE = [
  'prevents',
  'majority',
  'cutsOff',
  'zugzwang',
  'fianchetto',
  'makesRetreat',
  'blockades',
  'storm',
  'pawnBreak',
] as const;

const isEndgamePlan = ofKinds(ENDGAME);
const isLinePlan = ofKinds(LINE);
const isSquarePlan = ofKinds(SQUARE);

// A square taken from a piece, a wing's majority pushed, a king cut off, a
// zugzwang, a bishop fianchettoed, a square freed for one to step back to, a
// pawn blockaded.
function squareWays(plan: PlanOf<(typeof SQUARE)[number]>, sentences: PlanSentences): Ways {
  if (plan.kind === 'prevents')
    return sentences.prevents(plan.piece, plan.square, plan.target, plan.pin);
  if (plan.kind === 'majority') return sentences.majority(plan.queenside, plan.mine, plan.theirs);
  if (plan.kind === 'cutsOff') return sentences.cutsOff(plan.file);
  if (plan.kind === 'zugzwang') return sentences.zugzwang;
  if (plan.kind === 'makesRetreat') return sentences.makesRetreat(plan.piece, plan.square);
  if (plan.kind === 'blockades') return sentences.blockades(plan.piece, plan.pawn);
  if (plan.kind === 'storm') return sentences.storm(plan.file);
  if (plan.kind === 'pawnBreak') return sentences.pawnBreak(plan.square, plan.base, plan.king);
  return sentences.fianchetto(plan.piece, plan.aim);
}

function endgameWays(plan: PlanOf<(typeof ENDGAME)[number]>, sentences: PlanSentences): Ways {
  if (plan.kind === 'queenTrade') return sentences.queenTrade(plan.declined);
  if (plan.kind === 'passedPawn') return sentences.passedPawn(plan.made, plan.trait);
  if (plan.kind === 'outruns' || plan.kind === 'entersSquare')
    return sentences[plan.kind](plan.king);
  return sentences[plan.kind](plan.pawn, plan.square);
}

function lineWays(plan: PlanOf<(typeof LINE)[number]>, sentences: PlanSentences): Ways {
  if (plan.kind === 'openFile') return sentences.openFile(plan.halfOpen, plan.contested);
  if (plan.kind === 'fileBattery')
    return sentences.fileBattery(plan.mover, plan.partner, plan.halfOpen);
  if (plan.kind === 'diagonalBattery')
    return sentences.diagonalBattery(plan.mover, plan.partner, plan.target);
  if (plan.kind === 'opensLine') return sentences.opensLine(plan.slider, plan.line);
  return sentences.discovery(plan.slider, plan.screen, plan.target);
}

/** The ways to say a plan. */
export function planWays(plan: Plan, sentences: PlanSentences): Ways {
  if (isPlain(plan)) return sentences[plan.kind];
  if (isEndgamePlan(plan)) return endgameWays(plan, sentences);
  if (isLinePlan(plan)) return lineWays(plan, sentences);
  if (isSquarePlan(plan)) return squareWays(plan, sentences);
  if (plan.kind === 'attacksPawn')
    return sentences.attacksPawn(plan.piece, plan.square, plan.outnumbered === true);
  if (plan.kind === 'hitsPinned') return sentences.hitsPinned(plan.piece, plan.square);
  if (plan.kind === 'chases' && plan.trapped)
    return sentences.traps(plan.piece, plan.square ?? null);
  if (plan.kind === 'chases' || plan.kind === 'guards' || plan.kind === 'backs')
    return sentences[plan.kind](plan.piece, plan.square ?? null);
  if (plan.kind === 'pins') return sentences.pins(plan.piece, plan.behind);
  return sentences[plan.kind](plan.piece);
}
