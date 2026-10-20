import { parseSquare } from '#shared/chess/index.ts';
import type { Mark } from '#page/board/review-arrows.ts';
import { playLine, playOn, type Ply } from '#page/review/chess/played-line.ts';
import { type PinnedTaker, pinnedTaker } from '#page/review/chess/rays.ts';
import { type ChipPlay, moveToken } from '#page/review/comment/tokens.ts';
import type { PinnedTake } from '#page/review/i18n/types.ts';
import type { FactInput } from './fact.ts';
import { type Fact, oneOf, said, withDetail } from './said.ts';
import { pinLine } from './tactic-marks.ts';
import { whichOne } from './which-one.ts';

// A pin that keeps the piece a move put down from being taken: its only
// taker is pinned to a piece worth more (chess/rays.ts), which taking loses.

/**
 * The pin on the taker of what `last` put down, written out, with the moves by
 * which taking loses: their chips play on from `play`, the moves up to `last`.
 */
export function pinnedTake(last: Ply, pin: PinnedTaker, play: ChipPlay): PinnedTake | null {
  const [pinned, pinner, behind] = [pin.taker, pin.pinner, pin.behind].map(at =>
    last.after.get(at),
  );
  const ucis = [`${pin.taker}${last.uci.slice(2, 4)}`, `${pin.pinner}${pin.behind}`];
  const punished = playOn(last, ucis);
  if (!pinned || !pinner || !behind || punished.length < ucis.length) return null;
  const [take = '', punish = ''] = punished.map((ply, k) =>
    moveToken(ply.san, ply.color, { ...play, ucis: [...play.ucis, ...ucis.slice(0, k + 1)] }),
  );
  const squares = { pinned: pin.taker, pinner: pin.pinner, behind: pin.behind };
  return { pinned, pinner, behind, squares, take, punish };
}

/** The pinner's line to the piece behind, through the pinned taker. */
export const pinMarks = (pin: PinnedTaker): Mark[] => pinLine(pin.pinner, pin.taker, pin.behind);

/** A sacrifice whose piece can't be taken, its only taker pinned. */
export function pinnedOfferFact({ move, facts, them, after }: FactInput): Fact | null {
  const [ply] = playLine(move.previousPosition.fen, [move.uci]);
  const at = parseSquare(move.uci.slice(2, 4));
  const offered = at && ply?.after.get(at);
  const pin = ply && at ? pinnedTaker(ply.after, at, them) : null;
  const take = ply && pin ? pinnedTake(ply, pin, { base: 'a', ucis: [] }) : null;
  if (!offered || !pin || !take) return null;
  const named = { piece: offered, square: whichOne(after, at, offered) };
  const pinned = { piece: take.pinned, square: whichOne(after, pin.taker, take.pinned) };
  const fact = said(oneOf(facts.offeredPinned(named, pinned), move), 'pin', pinMarks(pin));
  return withDetail(fact, oneOf(facts.pinLine(take), move));
}
