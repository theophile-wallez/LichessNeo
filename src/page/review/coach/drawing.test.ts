import { describe, expect, it } from 'vitest';
import { type Color, opposite, parseFen, type Piece } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { reasonMarks, type Scene, withMove } from './drawing.ts';
import type { Reason } from './idea.ts';

const white = (role: Piece['role']): Piece => ({ role, color: 'white' });
const black = (role: Piece['role']): Piece => ({ role, color: 'black' });

/** The move `uci` from `fen`, drawn on the board after it. */
function scene(fen: string, uci: string): Scene {
  const { board, turn } = parseFen(fen);
  const after = boardAfter(board, uci);
  const toMove: Color = opposite(turn);
  return { uci, before: board, after, shown: after, toMove };
}

const marks = (reason: Reason | null, fen: string, uci: string) =>
  reasonMarks(reason, scene(fen, uci));

describe('reasonMarks', () => {
  it('draws a fork’s lines to each piece, and rings them', () => {
    const fork = { kind: 'fork', first: black('king'), second: black('rook') } as const;
    expect(marks(fork, 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', 'b5c7')).toEqual([
      { kind: 'link', from: 'c7', to: 'e8', tone: 'attack' },
      { kind: 'link', from: 'c7', to: 'a8', tone: 'attack' },
      { kind: 'ring', square: 'e8', tone: 'attack' },
      { kind: 'ring', square: 'a8', tone: 'attack' },
    ]);
  });

  it('draws a pin through the pinned piece, to what stands behind it', () => {
    const pin = { kind: 'pins', piece: black('knight'), behind: black('king') } as const;
    expect(marks(pin, '4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1', 'f1b5')).toEqual([
      { kind: 'link', from: 'b5', to: 'e8', tone: 'attack' },
      { kind: 'ring', square: 'c6', tone: 'attack' },
      { kind: 'ring', square: 'e8', tone: 'plan' },
    ]);
  });

  it('draws the line to a piece chased, but only a ring on a piece defended', () => {
    const chased = { kind: 'chases', piece: black('rook') } as const;
    expect(marks(chased, '4k3/8/8/3r4/8/8/8/1N2K3 w - - 0 1', 'b1c3')).toEqual([
      { kind: 'link', from: 'c3', to: 'd5', tone: 'attack' },
      { kind: 'ring', square: 'd5', tone: 'attack' },
    ]);
    const guarded = { kind: 'guards', piece: white('knight') } as const;
    expect(marks(guarded, '3rk3/8/8/8/3N4/8/8/R3K3 w - - 0 1', 'a1a4')).toEqual([
      { kind: 'ring', square: 'd4', tone: 'defense' },
    ]);
    expect(marks(chased, '4k3/8/8/8/8/8/8/1N2K3 w - - 0 1', 'b1c3')).toBeNull();
  });

  it('rings a piece saved, and a knight on its outpost with the pawn holding it', () => {
    expect(
      marks({ kind: 'saves', piece: white('bishop') }, '4k3/8/8/8/8/8/8/2B1K3 w - - 0 1', 'c1d2'),
    ).toEqual([{ kind: 'ring', square: 'd2', tone: 'defense' }]);
    const outpost = { kind: 'outpost', piece: white('knight') } as const;
    expect(marks(outpost, '4k3/p6p/8/8/3P4/5N2/8/4K3 w - - 0 1', 'f3e5')).toEqual([
      { kind: 'ring', square: 'e5', tone: 'defense' },
      { kind: 'link', from: 'd4', to: 'e5', tone: 'defense' },
    ]);
  });

  it('marks a passed pawn’s road, and the rook come behind it', () => {
    expect(
      marks({ kind: 'passedPawn', made: false }, '4k3/8/8/1P6/8/8/8/4K3 w - - 0 1', 'b5b6'),
    ).toEqual([{ kind: 'cells', squares: ['b7', 'b8'], tone: 'plan' }]);
    expect(marks({ kind: 'behindPasser' }, '4k3/8/1P6/8/8/8/8/R3K3 w - - 0 1', 'a1b1')).toEqual([
      { kind: 'link', from: 'b1', to: 'b6', tone: 'defense' },
      { kind: 'cells', squares: ['b7', 'b8'], tone: 'plan' },
    ]);
  });

  it('marks a rook’s file or rank out from the rook, and the square a pawn leaves the king', () => {
    const file = ['d3', 'd5', 'd2', 'd6', 'd1', 'd7', 'd8'];
    expect(
      marks({ kind: 'openFile', halfOpen: false }, '4k3/8/8/8/R7/8/8/4K3 w - - 0 1', 'a4d4'),
    ).toEqual([{ kind: 'cells', squares: file, tone: 'plan' }]);
    const rank = ['b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7'];
    expect(marks({ kind: 'seventhRank' }, '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', 'a1a7')).toEqual([
      { kind: 'cells', squares: rank, tone: 'plan' },
    ]);
    expect(marks({ kind: 'luft' }, '6k1/8/8/8/8/8/5PPP/6K1 w - - 0 1', 'h2h3')).toEqual([
      { kind: 'cells', squares: ['h2'], tone: 'defense' },
    ]);
  });

  it('draws the rule of the square on the board shown, and the opposition', () => {
    const race = { kind: 'outruns', file: 0, king: black('king'), made: false } as const;
    expect(marks(race, '8/8/8/5k2/P7/8/8/7K w - - 0 1', 'a4a5')).toEqual([
      { kind: 'area', from: 'a5', to: 'd8' },
      { kind: 'ring', square: 'f5', tone: 'attack' },
    ]);
    expect(marks({ kind: 'opposition' }, '8/8/8/4k3/8/3K4/3P4/8 w - - 0 1', 'd3e3')).toEqual([
      { kind: 'cells', squares: ['e4'], tone: 'plan' },
      { kind: 'ring', square: 'e3', tone: 'plan' },
      { kind: 'ring', square: 'e5', tone: 'plan' },
    ]);
  });

  it('draws both plans of a move one after the other', () => {
    const fen = 'r3qr2/1p3bkp/2n3p1/3p2P1/3N3P/1P1B4/N2Q1P2/1K1R3R w - - 1 26';
    const discovery = {
      kind: 'discovery',
      slider: white('queen'),
      screen: white('knight'),
      target: black('king'),
    } as const;
    const saves = { kind: 'saves', piece: white('queen') } as const;
    expect(marks({ kind: 'both', first: saves, second: discovery }, fen, 'd2b2')).toEqual([
      { kind: 'ring', square: 'b2', tone: 'defense' },
      { kind: 'link', from: 'b2', to: 'g7', tone: 'attack' },
      { kind: 'ring', square: 'd4', tone: 'plan' },
      { kind: 'ring', square: 'g7', tone: 'attack' },
    ]);
    const develops = { kind: 'develops', piece: white('queen') } as const;
    expect(marks({ kind: 'both', first: develops, second: develops }, fen, 'd2b2')).toBeNull();
  });

  it('draws nothing of a reason it has no drawing for, or of none', () => {
    const fen = '4k3/8/8/8/8/8/8/4K1N1 w - - 0 1';
    expect(marks({ kind: 'develops', piece: white('knight') }, fen, 'g1f3')).toBeNull();
    expect(marks(null, fen, 'g1f3')).toBeNull();
  });
});

describe('withMove', () => {
  it('puts the move’s line under the drawing', () => {
    const ring = { kind: 'ring', square: 'f3', tone: 'defense' } as const;
    expect(withMove('g1f3', 'plan', [ring])).toEqual([
      { kind: 'link', from: 'g1', to: 'f3', tone: 'plan' },
      ring,
    ]);
  });

  it('draws no line alone, without a drawing to go with it', () => {
    expect(withMove('g1f3', 'plan', [])).toBeNull();
    expect(withMove('g1f3', 'plan', null)).toBeNull();
  });
});
