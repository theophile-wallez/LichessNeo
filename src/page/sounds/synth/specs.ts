import type { CueName, NoiseLayer, Spec, ToneLayer } from '@foleyjs/core';
import type { Role } from '#shared/chess/types.ts';
import type { SoundName } from '#shared/sounds.ts';

// The extension's own sound set, as Foley's layer specs: a sound per piece
// (a bishop has its slide only, Foley's swoosh or whoosh, synth.ts), what a
// capture and a check add on top, and Foley's own cues for the rest.
// The levels are matched by ear: the low ones louder, as they sound softer.

type ToneInput = Partial<ToneLayer> & Pick<ToneLayer, 'f' | 'd' | 'peak'>;
type NoiseInput = Partial<NoiseLayer> & Pick<NoiseLayer, 'f' | 'd' | 'peak'>;

const tone = (layer: ToneInput): ToneLayer => ({
  kind: 'tone',
  at: 0,
  wave: 'sine',
  f2: null,
  glide: 0.04,
  a: 0.003,
  send: 0,
  ...layer,
});

const noise = (layer: NoiseInput): NoiseLayer => ({
  kind: 'noise',
  at: 0,
  filter: 'bandpass',
  f2: null,
  glide: 0.1,
  q: 1,
  a: 0.002,
  send: 0,
  ...layer,
});

export const PIECE_SPECS: Readonly<Record<Exclude<Role, 'bishop'>, Spec>> = {
  // A light, dry tap of wood.
  pawn: [noise({ f: 1900, q: 1.3, d: 0.022, peak: 0.24 }), tone({ f: 523, d: 0.06, peak: 0.11 })],
  // A short lift of air, then a dull wooden landing: a jump.
  knight: [
    noise({ f: 700, f2: 2600, glide: 0.06, q: 1.6, a: 0.01, d: 0.06, peak: 0.08 }),
    tone({ at: 0.075, f: 196, f2: 150, glide: 0.04, d: 0.07, peak: 0.26 }),
    noise({ at: 0.075, filter: 'lowpass', f: 900, d: 0.025, peak: 0.2 }),
  ],
  // A heavy, low thock.
  rook: [
    tone({ f: 130, f2: 98, glide: 0.03, d: 0.08, peak: 0.34 }),
    tone({ wave: 'triangle', f: 262, d: 0.03, peak: 0.08 }),
    noise({ filter: 'lowpass', f: 800, d: 0.03, peak: 0.22 }),
  ],
  // A full tap with a little ring.
  queen: [
    noise({ f: 2100, q: 1.2, d: 0.02, peak: 0.18 }),
    tone({ f: 659, d: 0.26, peak: 0.1, send: 0.4 }),
    tone({ f: 988, d: 0.18, peak: 0.035, send: 0.4 }),
    tone({ f: 1319, d: 0.12, peak: 0.015, send: 0.4 }),
  ],
  // A low, felted knock.
  king: [
    tone({ f: 98, f2: 78, glide: 0.05, d: 0.13, peak: 0.32 }),
    noise({ filter: 'lowpass', f: 420, d: 0.045, peak: 0.2 }),
    tone({ f: 196, d: 0.09, peak: 0.05, send: 0.15 }),
  ],
};

/** A capture's dull blow, under the piece's own sound. */
export const IMPACT: Spec = [
  noise({ filter: 'lowpass', f: 650, d: 0.06, peak: 0.26 }),
  tone({ f: 170, f2: 62, glide: 0.08, d: 0.11, peak: 0.24 }),
];

/** A check's short ping, over the move. */
export const CHECK: Spec = [
  tone({ f: 1318.5, d: 0.3, peak: 0.1, send: 0.4 }),
  tone({ f: 1975.5, d: 0.22, peak: 0.04, send: 0.4 }),
];

export type MoveSoundName = Extract<
  SoundName,
  | 'move-self'
  | 'move-opponent'
  | 'move-check'
  | 'move-slide'
  | 'move-slide-check'
  | 'move-knight'
  | 'capture'
  | 'capture-check'
  | 'capture-slide'
  | 'capture-slide-check'
  | 'castle'
  | 'promote'
  | 'capture-promote'
>;

/** The sounds that aren't a move's: Foley's own cues. */
export const CUES: Readonly<Record<Exclude<SoundName, MoveSoundName>, CueName>> = {
  premove: 'tick',
  illegal: 'denied',
  notify: 'chime',
  tenseconds: 'warning',
  'game-start': 'ready',
  'game-end': 'complete',
};

export const isMoveSound = (name: SoundName): name is MoveSoundName => !(name in CUES);
