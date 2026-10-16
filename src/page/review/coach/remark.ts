import { forColor } from '#page/review/evaluation/score.ts';
import { isError } from '#page/review/classes/classes.ts';
import type { RemarkPools } from '#page/review/i18n/types.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { type CoachContext, moveSeed } from './context.ts';
import { hash } from './hash.ts';

// A short comment under the coach's verdict. Some situations (a mate, a side's
// first book move…) replace the class's pool; the others (castling, a capture…)
// mix with it.

function signedMate(record: MoveVerdict['before'], sign: number): number | null {
  return 'mate' in record ? record.mate * sign : null;
}

function overridingPool(move: MoveVerdict, pools: RemarkPools): readonly string[] | null {
  const sign = move.color === 'white' ? 1 : -1;
  const mateAfter = signedMate(move.after, sign);
  if (move.san.includes('#')) return pools.mate;
  if (move.moveClass === 'book' && move.position.ply <= 2) return pools.firstMove;
  if (isError(move.moveClass) && mateAfter !== null && mateAfter < 0) return pools.allowsMate;
  if ((signedMate(move.before, sign) ?? 0) > 0)
    return (mateAfter ?? 0) > 0 ? pools.mating : pools.missedMate;
  return null;
}

function situationPool(move: MoveVerdict, pools: RemarkPools): string[] {
  const { san } = move;
  const winChance = forColor(move.after.whiteWinChance, move.color);
  const pool: string[] = [];
  if (!isError(move.moveClass)) {
    if (san.startsWith('O-O')) pool.push(...pools.castle);
    if (san.includes('=Q')) pool.push(...pools.promote);
    if (san.includes('+')) pool.push(...pools.check);
    if (san.includes('x')) pool.push(...pools.capture);
    if (winChance >= 90) pool.push(...pools.winning);
    return pool;
  }
  if (san.includes('x')) pool.push(...pools.badCapture);
  if (san.startsWith('Q') && move.position.ply <= 12) pool.push(...pools.earlyQueen);
  if (san.startsWith('K') && move.position.ply <= 20) pool.push(...pools.earlyKing);
  if (winChance <= 10) pool.push(...pools.losing);
  return pool;
}

export function remark(move: MoveVerdict, context: CoachContext): string {
  const { remarks, typography } = context.language;
  const seed = moveSeed(move, context);
  const situations = situationPool(move, remarks);
  const pool =
    overridingPool(move, remarks) ??
    (situations.length > 0 && hash(`${seed}:ctx`) % 2 === 1 ? situations : remarks[move.moveClass]);
  return typography(pool[hash(seed) % pool.length] ?? '');
}
