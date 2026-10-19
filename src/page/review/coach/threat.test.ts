import { describe, expect, it } from 'vitest';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { judge } from '#page/review/judge/judge.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { menaceOf, passedFen, stillThreatens, type Threat } from './threat.ts';

// The bishop on d7 eyes the undefended knight on a4.
const KNIGHT_HANGS = '6k1/3b1ppp/8/8/N7/8/1P3PPP/6K1 w - - 0 1';
const KNIGHT_HANGS_PASSED = '6k1/3b1ppp/8/8/N7/8/1P3PPP/6K1 b - - 0 1';
// The rook on a8 mates on the back rank, Black to move.
const BACK_RANK_PASSED = 'r5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1';

const record = (score: { cp: number } | { mate: number }, line: string[]): PositionRecord => ({
  ...score,
  whiteWinChance: 50,
  secondLineWinChance: null,
  best: line[0] ?? null,
  line,
});

const threat = (fen: string, score: { cp: number } | { mate: number }, line: string[]): Threat => ({
  fen,
  record: record(score, line),
});

/** White's move from KNIGHT_HANGS, with the engine's line after it. */
function knightMove(uci: string, fen: string, after: PositionRecord): MoveVerdict {
  return judge({
    previousPosition: { ply: 0, fen: KNIGHT_HANGS },
    position: { ply: 1, fen, uci, san: uci === 'a4c3' ? 'Nc3' : 'h3' },
    before: record({ cp: 0 }, ['h2h3']),
    after,
    book: false,
    chess960: false,
  });
}

const TO_C3 = '6k1/3b1ppp/8/8/8/2N5/1P3PPP/6K1 b - - 1 1';
const TO_H3 = '6k1/3b1ppp/8/8/N7/7P/1P3PP1/6K1 b - - 0 1';

describe('passedFen', () => {
  it('hands the move to the other side, and keeps the move number when White passes', () => {
    expect(passedFen(KNIGHT_HANGS)).toBe(KNIGHT_HANGS_PASSED);
  });

  it('drops the en passant square, the double step no longer the last move', () => {
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';
    expect(passedFen(fen)).toBe('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2');
  });

  it('starts the next move when Black passes', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    expect(passedFen(fen)).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
  });

  it('can’t pass out of check', () => {
    expect(passedFen('4k3/8/8/8/8/8/4r3/4K3 w - - 0 1')).toBeNull();
  });
});

describe('menaceOf', () => {
  it('reads a piece won at once and kept', () => {
    const menace = menaceOf(
      threat(KNIGHT_HANGS_PASSED, { cp: -300 }, ['d7a4', 'g1f1', 'g8f8']),
      'black',
    );
    expect(menace?.mate).toBeNull();
    expect(menace?.won).toMatchObject({ won: [{ role: 'knight', color: 'white' }], net: 3 });
    expect(menace?.plies.map(ply => ply.san)).toEqual(['Bxa4', 'Kf1', 'Kf8']);
  });

  it('is no threat when the line starts with a quiet move: that’s a plan', () => {
    const quiet = threat(KNIGHT_HANGS_PASSED, { cp: -300 }, ['g8f8', 'g1f1', 'd7a4', 'f1e1']);
    expect(menaceOf(quiet, 'black')).toBeNull();
  });

  it('is no threat when the capture is only a trade', () => {
    const defended = '6k1/3b1ppp/8/8/N7/1P6/5PPP/6K1 b - - 0 1';
    expect(menaceOf(threat(defended, { cp: 0 }, ['d7a4', 'b3a4', 'g8f8']), 'black')).toBeNull();
  });

  it('keeps a sure mate, and drops a long one', () => {
    const mate = menaceOf(threat(BACK_RANK_PASSED, { mate: -1 }, ['a8a1']), 'black');
    expect(mate).toMatchObject({ mate: 1, won: null });
    expect(menaceOf(threat(BACK_RANK_PASSED, { mate: -8 }, ['a8a1']), 'black')).toBeNull();
  });

  it('is no mate the other side gives', () => {
    expect(menaceOf(threat(BACK_RANK_PASSED, { mate: 1 }, ['a8a1']), 'black')).toBeNull();
  });
});

describe('stillThreatens', () => {
  const menace = menaceOf(
    threat(KNIGHT_HANGS_PASSED, { cp: -300 }, ['d7a4', 'g1f1', 'g8f8']),
    'black',
  );
  if (!menace) throw new Error('no menace');

  it('is over once the line after the move wins nothing', () => {
    const move = knightMove('a4c3', TO_C3, record({ cp: 0 }, ['g8f8', 'g1f1']));
    expect(stillThreatens(move, menace, 'black')).toBe(false);
  });

  it('goes on while the line after the move still wins as much', () => {
    const move = knightMove('h2h3', TO_H3, record({ cp: -300 }, ['d7a4', 'g1h2', 'g8f8']));
    expect(stillThreatens(move, menace, 'black')).toBe(true);
  });

  it('goes on when the move has no line to tell', () => {
    const move = knightMove('a4c3', TO_C3, {
      cp: 0,
      whiteWinChance: 50,
      secondLineWinChance: null,
      best: 'g8f8',
    });
    expect(stillThreatens(move, menace, 'black')).toBe(true);
  });

  it('goes on when the opponent mates after the move', () => {
    const move = knightMove('h2h3', TO_H3, record({ mate: -3 }, ['g8f8', 'g1h2']));
    expect(stillThreatens(move, menace, 'black')).toBe(true);
  });
});
