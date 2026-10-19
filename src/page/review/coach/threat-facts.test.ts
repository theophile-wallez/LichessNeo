import { describe, expect, it } from 'vitest';
import { opposite } from '#shared/chess/index.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { en } from '#page/review/i18n/en.ts';
import { fr } from '#page/review/i18n/fr.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import { judge } from '#page/review/judge/judge.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { LineFactInput } from './line-facts.ts';
import { letsThrough, parriedFact, threatensFact } from './threat-facts.ts';
import { passedFen, type Threat } from './threat.ts';

// Each position is White's to move; its threats are the engine's lines
// after a pass, written out by hand.

type Score = { cp: number } | { mate: number };

const record = (score: Score, line: string[]): PositionRecord => ({
  ...score,
  whiteWinChance: 50,
  secondLineWinChance: null,
  best: line[0] ?? null,
  line,
});

interface MoveCase {
  readonly from: string;
  readonly uci: string;
  readonly san: string;
  readonly to: string;
  readonly before?: Score;
  /** The engine's score and line after the move. */
  readonly after: readonly [Score, string[]];
}

function move({ from, uci, san, to, before = { cp: 0 }, after }: MoveCase): MoveVerdict {
  return judge({
    previousPosition: { ply: 0, fen: from },
    position: { ply: 1, fen: to, uci, san },
    before: record(before, [uci]),
    after: record(...after),
    book: false,
    chess960: false,
  });
}

function input(verdict: MoveVerdict, language: ReviewLanguage = en): LineFactInput {
  return { move: verdict, facts: language.facts, me: verdict.color, them: opposite(verdict.color) };
}

/** The threat of the position `fen` would have after a pass. */
function threat(fen: string, score: Score, line: string[]): Threat {
  const passed = passedFen(fen);
  if (passed === null) throw new Error(`can’t pass in ${fen}`);
  return { fen: passed, record: record(score, line) };
}

// The bishop on d7 eyes the undefended knight on a4.
const KNIGHT_HANGS = '6k1/3b1ppp/8/8/N7/8/1P3PPP/6K1 w - - 0 1';
const TAKES_KNIGHT = threat(KNIGHT_HANGS, { cp: -300 }, ['d7a4', 'g1f1', 'g8f8']);
const QUIET_AFTER: readonly [Score, string[]] = [{ cp: 0 }, ['g8f8', 'g1f1']];

const knightEscapes = move({
  from: KNIGHT_HANGS,
  uci: 'a4c3',
  san: 'Nc3',
  to: '6k1/3b1ppp/8/8/8/2N5/1P3PPP/6K1 b - - 1 1',
  after: QUIET_AFTER,
});
const pawnDefends = move({
  from: KNIGHT_HANGS,
  uci: 'b2b3',
  san: 'b3',
  to: '6k1/3b1ppp/8/8/N7/1P6/5PPP/6K1 b - - 0 1',
  after: QUIET_AFTER,
});
const pawnIdles = move({
  from: KNIGHT_HANGS,
  uci: 'h2h3',
  san: 'h3',
  to: '6k1/3b1ppp/8/8/N7/7P/1P3PP1/6K1 b - - 0 1',
  after: [{ cp: -300 }, ['d7a4', 'g1h2', 'g8f8']],
});

// The rook on a8 mates on the back rank.
const BACK_RANK = 'r5k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1';
const makesRoom = move({
  from: BACK_RANK,
  uci: 'h2h3',
  san: 'h3',
  to: 'r5k1/5ppp/8/8/8/7P/5PP1/6K1 b - - 0 1',
  after: [{ cp: 0 }, ['a8a1', 'g1h2']],
});

describe('parriedFact', () => {
  it('says the piece threatened steps away', () => {
    expect(parriedFact(input(knightEscapes), TAKES_KNIGHT)?.text).toBe(
      'The [[p:wn]]knight gets out of the way of [[n:1...:b:Bxa4]].',
    );
    expect(parriedFact(input(knightEscapes, fr), TAKES_KNIGHT)?.text).toBe(
      'Le [[p:wn]]cavalier se met à l’abri de [[n:1...:b:Bxa4]].',
    );
  });

  it('says what a defense stops, and what it would have won', () => {
    expect(parriedFact(input(pawnDefends), TAKES_KNIGHT)?.text).toBe(
      'It stops [[n:1...:b:Bxa4]], which would have won a [[p:wn]]knight.',
    );
  });

  it('says nothing of a threat the move lets through', () => {
    expect(parriedFact(input(pawnIdles), TAKES_KNIGHT)).toBeNull();
  });

  it('says nothing of a threat the score doesn’t show', () => {
    const unsure = threat(KNIGHT_HANGS, { cp: -50 }, ['d7a4', 'g1f1', 'g8f8']);
    expect(parriedFact(input(pawnDefends), unsure)).toBeNull();
  });

  it('plays out a short mate it stops, and names a long one by its first move', () => {
    const mate = threat(BACK_RANK, { mate: -1 }, ['a8a1']);
    expect(parriedFact(input(makesRoom), mate)?.text).toBe('It stops the mate: [[n:1...:b:Ra1#]].');
    const long = threat(BACK_RANK, { mate: -4 }, ['a8a1']);
    expect(parriedFact(input(makesRoom), long)?.text).toBe(
      'It stops a mate in 4, starting with [[n:1...:b:Ra1+]].',
    );
  });
});

// The bishop on c1 can come to d2, at the undefended knight on b4.
const KNIGHT_ON_B4 = '6k1/5ppp/8/8/1n6/8/5PPP/2B3K1 w - - 0 1';

describe('threatensFact', () => {
  const bishopAims = move({
    from: KNIGHT_ON_B4,
    uci: 'c1d2',
    san: 'Bd2',
    to: '6k1/5ppp/8/8/1n6/8/3B1PPP/6K1 b - - 1 1',
    after: [{ cp: 0 }, ['b4c6', 'g1f1']],
  });

  it('says what a quiet move threatens to win', () => {
    const aimed = threat(bishopAims.position.fen, { cp: 300 }, ['d2b4', 'g8f8', 'g1f1']);
    expect(threatensFact(input(bishopAims), aimed)?.text).toBe(
      'It threatens [[n:2.:w:Bxb4]], which would win a [[p:bn]]knight.',
    );
    expect(threatensFact(input(bishopAims, fr), aimed)?.text).toBe(
      'Il menace [[n:2.:w:Bxb4]], qui gagnerait un [[p:bn]]cavalier.',
    );
  });

  it('says nothing of a threat that was already there', () => {
    const aimed = '6k1/5ppp/8/8/1n6/8/3B1PPP/6K1 w - - 0 1';
    const idles = move({
      from: aimed,
      uci: 'h2h3',
      san: 'h3',
      to: '6k1/5ppp/8/8/1n6/7P/3B1PP1/6K1 b - - 0 1',
      after: [{ cp: 0 }, ['b4c6', 'g1h2']],
    });
    const still = threat(idles.position.fen, { cp: 300 }, ['d2b4', 'g8f8', 'g1h2']);
    expect(threatensFact(input(idles), still)).toBeNull();
  });

  it('says a quiet move threatens mate', () => {
    const rookSwings = move({
      from: '6k1/1p3ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1',
      uci: 'b1d1',
      san: 'Rd1',
      to: '6k1/1p3ppp/8/8/8/8/5PPP/3R2K1 b - - 1 1',
      after: [{ cp: 600 }, ['h7h6', 'd1d8']],
    });
    const mate = threat(rookSwings.position.fen, { mate: 1 }, ['d1d8']);
    expect(threatensFact(input(rookSwings), mate)?.text).toBe(
      'It threatens mate, starting with [[n:2.:w:Rd8+]].',
    );
  });
});

describe('letsThrough', () => {
  it('is what an error lets the opponent play: the threat itself', () => {
    expect(letsThrough(input(pawnIdles), TAKES_KNIGHT)).toBe(true);
  });

  it('isn’t another reply', () => {
    const otherReply = move({
      from: KNIGHT_HANGS,
      uci: 'h2h3',
      san: 'h3',
      to: '6k1/3b1ppp/8/8/N7/7P/1P3PP1/6K1 b - - 0 1',
      after: [{ cp: -300 }, ['g8f8', 'g1h2']],
    });
    expect(letsThrough(input(otherReply), TAKES_KNIGHT)).toBe(false);
  });
});
