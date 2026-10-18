import { html, type SafeHtml } from '#shared/html.ts';

// The winner's confetti: a one-off shower over the board, each piece its own
// CSS animation (styles/game/game-end.css) from the numbers drawn here.

export type ConfettiShape = 'strip' | 'dot' | 'curl';

export interface ConfettiPiece {
  readonly shape: ConfettiShape;
  /** Across the board, 0 to 100. */
  readonly x: number;
  /** Sideways over the fall, in the board's hundredths. */
  readonly drift: number;
  /** Turns over the fall. */
  readonly spin: number;
  readonly size: number;
  readonly delayMs: number;
  readonly durationMs: number;
  readonly color: string;
}

export const CONFETTI_COUNT = 70;

// Mostly white, as on the board of the site it's modelled on, with a few warm ones.
const COLORS: readonly string[] = [
  '#ffffff',
  '#ffffff',
  '#ffffff',
  '#f7f3e8',
  '#ffe28a',
  '#c8e6a0',
];
const SHAPES: readonly ConfettiShape[] = ['strip', 'strip', 'dot', 'curl'];

const pick = <T>(list: readonly T[], random: () => number): T | undefined =>
  list[Math.floor(random() * list.length)];

/** `count` pieces, drawn with `random` in [0, 1). */
export function confettiPieces(count: number, random: () => number): ConfettiPiece[] {
  const between = (low: number, high: number): number => low + random() * (high - low);
  return Array.from({ length: count }, () => ({
    shape: pick(SHAPES, random) ?? 'strip',
    x: between(0, 100),
    drift: between(-18, 18),
    spin: between(-2.5, 2.5),
    size: between(0.8, 1.6),
    delayMs: Math.round(between(0, 700)),
    durationMs: Math.round(between(2200, 3400)),
    color: pick(COLORS, random) ?? '#ffffff',
  }));
}

/** When the last piece lands. */
export const confettiEndMs = (pieces: readonly ConfettiPiece[]): number =>
  Math.max(0, ...pieces.map(piece => piece.delayMs + piece.durationMs));

export function confettiMarkup(pieces: readonly ConfettiPiece[]): SafeHtml {
  const items = pieces.map(
    piece =>
      html`<i class="ln-ext-confetti__piece ln-ext-confetti__piece--${piece.shape}" style="--x:${piece.x.toFixed(1)};--drift:${piece.drift.toFixed(1)};--spin:${piece.spin.toFixed(2)};--size:${piece.size.toFixed(2)};--delay:${piece.delayMs}ms;--fall:${piece.durationMs}ms;--c:${piece.color}"></i>`,
  );
  return html`<div class="ln-ext-confetti">${items}</div>`;
}
