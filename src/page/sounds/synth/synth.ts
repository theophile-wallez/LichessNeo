import { play, playSpec, set, type PlayOptions } from '@foleyjs/core';
import type { Color, Square } from '#shared/chess/types.ts';
import type { SoundName, SoundPlace } from '#shared/sounds.ts';
import {
  boardOrientation,
  lastLanding,
  type Landing,
  mainBoardWrap,
  readBoard,
} from '#page/sounds/board-reader.ts';
import { advanced, pitchFor, placementFor } from './place.ts';
import {
  CHECK,
  CUES,
  IMPACT,
  isCue,
  isMoveSound,
  type MoveSoundName,
  PIECE_SPECS,
} from './specs.ts';

// The extension's own sound set, played live by Foley (Web Audio, no file):
// each piece its own sound, higher as it nears the other side, placed where
// it lands. A move's sound waits a frame, for the board to show the move.

/** The other side's moves: a little lower and softer, as Lichess's own are. */
const OPPONENT = { pitch: -3, volume: 0.7 };
const CHECK_DELAY_MS = 40;
/** Castling: the king, then the rook a beat later. */
const CASTLING_ROOK_DELAY_MS = 90;
const SPARKLE_DELAY_MS = 70;

export interface Synth {
  /** Plays `name` at `volume` (0 to 1), Lichess's own volume included. */
  readonly play: (name: SoundName, volume: number) => void;
  readonly setPlace: (place: SoundPlace) => void;
}

interface Performance {
  readonly name: MoveSoundName;
  readonly landing: Landing | null;
  readonly orientation: Color;
  readonly place: SoundPlace;
  readonly volume: number;
}

interface Voicing {
  /** Where a sound on `square` comes from, at the move's volume; the middle for none. */
  readonly at: (square: Square | null) => PlayOptions;
  /** The semitones of the other side's moves. */
  readonly shift: number;
}

function voicing({ landing, orientation, place, volume }: Performance): Voicing {
  const opponent = landing !== null && landing.color !== orientation;
  const shift = opponent ? OPPONENT : { pitch: 0, volume: 1 };
  return {
    at: square => {
      const { gain, ...where } = square ? placementFor(square, orientation, place) : { gain: 1 };
      return { ...where, volume: volume * shift.volume * gain };
    },
    shift: shift.pitch,
  };
}

function playPiece({ name, landing }: Performance, { at, shift }: Voicing): void {
  const options = at(landing?.to ?? null);
  if (name === 'castle') {
    playSpec(PIECE_SPECS.king, { ...options, id: 'king', pitch: shift });
    setTimeout(
      () => playSpec(PIECE_SPECS.rook, { ...options, id: 'castling-rook', pitch: shift }),
      CASTLING_ROOK_DELAY_MS,
    );
    return;
  }
  // A promoted pawn sounds as the pawn it was, at the top.
  const role = name === 'promote' || !landing ? 'pawn' : landing.role;
  // A bishop is its slide alone (playAccents).
  if (role === 'bishop') return;
  const pitch = landing ? pitchFor(landing.to, landing.color) : 0;
  playSpec(PIECE_SPECS[role], { ...options, id: role, pitch: pitch + shift });
}

/** What the move adds to its piece's sound: a bishop's slide, a capture's blow, a check's ping. */
function playAccents({ name, landing }: Performance, { at, shift }: Voicing): void {
  const options = at(landing?.to ?? null);
  // The bishop's slide starts where it left from.
  if (landing?.role === 'bishop' && name !== 'promote') {
    const forward = !landing.from || advanced(landing.from, landing.to, landing.color);
    play(forward ? 'swoosh' : 'whoosh', at(landing.from ?? landing.to));
  }
  if (name === 'capture') playSpec(IMPACT, { ...options, id: 'impact', pitch: shift });
  if (name === 'promote') setTimeout(() => play('sparkle', options), SPARKLE_DELAY_MS);
  if (name === 'move-check')
    setTimeout(() => playSpec(CHECK, { ...options, id: 'check' }), CHECK_DELAY_MS);
}

function playMove(performance: Performance): void {
  const voiced = voicing(performance);
  playPiece(performance, voiced);
  playAccents(performance, voiced);
}

// Placed in space, sounds lose some level with distance: the whole set is a bit louder.
const levelFor = (place: SoundPlace): number => (place === 'space' ? 1 : 0.8);

export function createSynth(initial: SoundPlace): Synth {
  let place = initial;
  set({ volume: levelFor(place) });
  return {
    play(name, volume) {
      if (volume <= 0) return;
      if (isCue(name)) {
        play(CUES[name], { volume });
        return;
      }
      if (!isMoveSound(name)) return;
      requestAnimationFrame(() => {
        const state = readBoard(mainBoardWrap());
        const landing = state ? lastLanding(state.pieces, state.lastMove) : null;
        playMove({ name, landing, orientation: boardOrientation(), place, volume });
      });
    },
    setPlace(next) {
      place = next;
      set({ volume: levelFor(place) });
    },
  };
}
