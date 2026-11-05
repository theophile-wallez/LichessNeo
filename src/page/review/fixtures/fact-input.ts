import { opposite, parseFen } from '#shared/chess/index.ts';
import { sanOf } from '#page/review/chess/notation.ts';
import type { FactInput } from '#page/review/coach/fact.ts';
import { NO_THREATS, type Threats } from '#page/review/coach/threat-facts.ts';
import { freshTold, type Told } from '#page/review/coach/told.ts';
import { moveToken } from '#page/review/comment/tokens.ts';
import { en } from '#page/review/i18n/en.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';

// What the coach's facts read of a judged move, as `findings` builds it, in
// English, with no threats around and nothing said before unless given: for
// the tests of a single fact.

export interface FactInputOptions {
  readonly threats?: Threats;
  readonly told?: Told;
}

/** The move's input to a fact, read by the reader who played it, the engine's reply as a token. */
export function factInput(
  move: MoveVerdict,
  { threats = NO_THREATS, told = freshTold() }: FactInputOptions = {},
): FactInput {
  const me = move.color;
  const them = opposite(me);
  const replyUci = move.after.best;
  const reply = replyUci
    ? moveToken(sanOf(move.position.fen, replyUci), them, { base: 'a', ucis: [replyUci] })
    : '';
  return {
    move,
    facts: en.facts,
    me,
    them,
    sign: me === 'white' ? 1 : -1,
    before: parseFen(move.previousPosition.fen).board,
    after: parseFen(move.position.fen).board,
    best: '',
    reply,
    threats,
    theirs: false,
    told,
  };
}
