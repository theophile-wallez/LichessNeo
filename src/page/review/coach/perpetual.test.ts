import { describe, expect, it } from 'vitest';
import { toRecord } from '#page/review/engine/record.ts';
import { playedBetween, playedFen } from '#page/review/fixtures/played.ts';
import { en } from '#page/review/i18n/en.ts';
import { factInput } from '#page/review/fixtures/fact-input.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { FactInput } from './fact.ts';
import { mateLine } from './line-facts.ts';
import { perpetualFact, perpetualLetFact } from './perpetual.ts';
import { passedFen, type Threat } from './threat.ts';
import { NO_THREATS, type Threats } from './threat-facts.ts';
import { freshTold, type Told } from './told.ts';

// Black's queen and bishop mate on g2 the moment White stops checking, so
// White's queen checks from d8 and h4, the king going from g8 to h7 and back.
const START = '6k1/1b3pp1/8/5P2/7Q/1q6/6PP/7K b - - 10 30';
const CYCLE = ['h4d8', 'g8h7', 'd8h4', 'h7g8'];

/** The engine's line after the series' move `index`, the checks going on. */
const lineAfter = (index: number): string[] =>
  Array.from({ length: 5 }, (_, i) => CYCLE[(index + i) % CYCLE.length] ?? '');

interface Step {
  readonly uci: string;
  /** The score before the move, from its mover's side. */
  readonly cp?: number;
}

/** Black's Qb2, then the checks and the king's steps, each judged on the engine's lines. */
function series(steps: readonly Step[]): MoveVerdict[] {
  const moves: MoveVerdict[] = [];
  let fen = START;
  for (const [index, { uci, cp = 0 }] of steps.entries()) {
    // No pawn moves and nothing is taken: the halfmove clock runs on.
    const next = playedFen(fen, uci).replace(' - - 0 ', ` - - ${11 + index} `);
    const from = { fen, lines: [{ cp, pv: [uci] }] };
    const to = { fen: next, lines: [{ cp: 0, pv: lineAfter(index) }] };
    moves.push(playedBetween([59 + index, from, to], uci, moves.at(-1)));
    fen = next;
  }
  return moves;
}

const PRELUDE: Step = { uci: 'b3b2' };
const checks = (count: number): Step[] =>
  Array.from({ length: count }, (_, i) => ({ uci: CYCLE[i % CYCLE.length] ?? '' }));
const moveAt = (moves: readonly MoveVerdict[], index: number): MoveVerdict => {
  const move = moves[index];
  if (!move) throw new Error(`no move ${index}`);
  return move;
};

/** Black's mate on g2, were White to pass in the position `fen`. */
function mateOnG2(fen: string): Threat {
  const passed = passedFen(fen);
  if (passed === null) throw new Error(`can’t pass in ${fen}`);
  return { fen: passed, record: toRecord(passed, { lines: [{ mate: 1, pv: ['b2g2'] }] }) };
}

const mateToken = ({ fen, record }: Threat): string | null => mateLine(record, fen, null);

const inputOf = (move: MoveVerdict, threats: Threats = NO_THREATS, told = freshTold()): FactInput =>
  factInput(move, { threats, told });

const toldPerpetual = (): Told => freshTold(new Set(['perpetual:white']));

describe('perpetualFact', () => {
  const moves = series([PRELUDE, ...checks(8)]);

  it('names the perpetual on its first check', () => {
    const text = perpetualFact(inputOf(moveAt(moves, 1)))?.text;
    expect(en.facts.perpetual('white')).toContain(text);
  });

  it('says once that it’s a perpetual', () => {
    expect(perpetualFact(inputOf(moveAt(moves, 1), NO_THREATS, toldPerpetual()))).toBeNull();
  });

  it('says the checks go on, and the mate they must keep off', () => {
    const move = moveAt(moves, 3);
    const threat = mateOnG2(moveAt(moves, 2).position.fen);
    const text = perpetualFact(
      inputOf(move, { before: threat, after: null }, toldPerpetual()),
    )?.text;
    expect(en.facts.checksOn('white', mateToken(threat))).toContain(text);
    expect(text).toContain('Qxg2');
  });

  it('says the king can’t get away from the second check on', () => {
    const move = moveAt(moves, 4);
    const threat = mateOnG2(move.position.fen);
    const text = perpetualFact(inputOf(move, { before: null, after: threat }))?.text;
    expect(en.facts.noEscape('white', mateToken(threat))).toContain(text);
    // The king's first step, a single check in: nothing to say yet.
    expect(perpetualFact(inputOf(moveAt(moves, 2)))).toBeNull();
  });

  it('sees the position stand a third time', () => {
    // After Qb2, Kg8 and Kg8 again: the queen back on h4 each time.
    const text = perpetualFact(inputOf(moveAt(moves, 8)))?.text;
    expect(en.facts.repetition(null)).toContain(text);
  });

  it('says nothing of a check the engine doesn’t call a draw', () => {
    const winning = {
      ...moveAt(moves, 1),
      after: toRecord(START, { lines: [{ cp: 400, pv: lineAfter(1) }] }),
    };
    expect(perpetualFact(inputOf(winning))).toBeNull();
  });

  it('says nothing of a move that is no check', () => {
    expect(perpetualFact(inputOf(moveAt(moves, 0)))).toBeNull();
  });
});

describe('perpetualLetFact', () => {
  it('says the winning side’s error lets the checks in', () => {
    const [error] = series([{ ...PRELUDE, cp: 600 }]);
    if (!error) throw new Error('no move');
    const input = inputOf(error);
    expect(en.facts.letsPerpetual('white', input.reply)).toContain(perpetualLetFact(input)?.text);
  });

  it('says nothing of a side that wasn’t winning', () => {
    const [move] = series([PRELUDE]);
    expect(move && perpetualLetFact(inputOf(move))).toBeNull();
  });
});
