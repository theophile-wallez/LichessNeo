import type { Color, Piece } from '#shared/chess/index.ts';
import type { MotifKind } from '#page/review/chess/motifs.ts';
import type { PressureKind } from '#page/review/chess/motifs-pressure.ts';
import type { Material, Named, Ways } from './types.ts';

// The sentences read off the engine's lines, as each language writes them.

/** What names a motif: its kind, its move as a token, and the pieces it hits. */
export type MotifNamer = (kind: MotifKind, move: string, pieces: readonly Named[]) => Ways | null;

/** What names a pressure motif: its kind, its move as a token, and the pieces it's about. */
export type PressureNamer = (
  kind: PressureKind,
  move: string,
  pieces: readonly Named[],
) => Ways | null;

/** What a line wins: the material, its moves as tokens, and how many of the winner's they are. */
export interface LineGain {
  readonly material: string;
  readonly line: string;
  readonly moves: number;
}

/** The facts read off the engine's lines, their moves unnumbered. */
export interface LineFacts {
  /** "a [knight] for a [pawn]", "the exchange"; null when it's too much to say. */
  readonly material: (material: Material) => string | null;
  /** The tactic that wins it, after its move: "Qc7+ forks the king and the rook." */
  readonly motif: MotifNamer;
  /** The pressure that wins it: "Na5 chases off the bishop, and the d5 pawn loses its guard." */
  readonly pressure: PressureNamer;
  /** A move slipped in before taking back, a check or not, and the recapture that follows. */
  /** The retake `moves` of the mover's moves on, the move itself the first. */
  readonly inBetween: (retake: string, check: boolean, moves: number) => Ways;
  /** The mover's next move along the line, and what it does, for a quiet move's idea. */
  readonly nextUp: (next: string, why: string) => Ways;
  /** The mate an error lets in, move by move. */
  readonly forcesMate: (side: Color, line: string) => Ways;
  /** What an error lets `side` win, and the line that wins it: what `side` threatened, maybe. */
  readonly losesMaterial: (side: Color, gain: LineGain, threatened: boolean) => Ways;
  readonly wouldHaveWon: (side: Color, gain: LineGain) => Ways;
  /** What a move wins along its line, the move first. */
  readonly winsAlong: (gain: LineGain) => Ways;
  /** The threat a move stops, and what it would have won. */
  readonly stopsThreat: (threat: string, material: string) => Ways;
  /** A mate stopped, and the piece given up to stop it, if one is. */
  readonly stopsMate: (line: string, cost: Piece | null) => Ways;
  readonly stopsLongMate: (moves: number, first: string, cost: Piece | null) => Ways;
  /** A piece that moves out of the threat's way. */
  readonly escapes: (piece: Piece, threat: string) => Ways;
  /** What a move threatens, were the opponent to pass. */
  /** `threat` wins `material`: by taking it, or `direct` false, by a capture on the way to it. */
  readonly threatens: (threat: string, material: string, direct: boolean) => Ways;
  readonly threatensMate: (threat: string, moves: number) => Ways;
  /** A capture that threatens mate too. */
  readonly takesAndThreatensMate: (piece: Piece, threat: string, moves: number) => Ways;
}
