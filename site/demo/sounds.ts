import { play, playSpec } from '@foleyjs/core';
import { closestTo, queryAll } from '#shared/dom.ts';
import type { Color, Role, Square } from '#shared/chess/types.ts';
import { pitchFor } from '#page/sounds/synth/place.ts';
import { IMPACT, PIECE_SPECS } from '#page/sounds/synth/specs.ts';

// The sounds tile's play buttons (index.html's .sound-sets): the Opera Game's
// first eight moves in each of our two sets, Boxwood's recorded takes and
// Ascent played live, as the extension plays them (page/sounds/synth).

const STEP_MS = 520;

interface Step {
  readonly role: Role;
  readonly color: Color;
  readonly to: Square;
  readonly capture?: boolean;
  /** The Boxwood take the move sounds as. */
  readonly take: string;
}

const OPERA: readonly Step[] = [
  { role: 'pawn', color: 'white', to: 'e4', take: 'move-self-1' },
  { role: 'pawn', color: 'black', to: 'e5', take: 'move-opponent-1' },
  { role: 'knight', color: 'white', to: 'f3', take: 'move-knight-1' },
  { role: 'pawn', color: 'black', to: 'd6', take: 'move-opponent-2' },
  { role: 'pawn', color: 'white', to: 'd4', take: 'move-self-2' },
  { role: 'bishop', color: 'black', to: 'g4', take: 'move-slide-1' },
  { role: 'pawn', color: 'white', to: 'e5', take: 'capture-1', capture: true },
  { role: 'bishop', color: 'black', to: 'f3', take: 'capture-slide-1', capture: true },
];

// Each take written out whole for scripts/lib/site-assets.ts, which copies what's named.
const TAKES: Readonly<Record<string, string>> = {
  'move-self-1': 'sounds/boxwood/move-self-1.ogg',
  'move-opponent-1': 'sounds/boxwood/move-opponent-1.ogg',
  'move-knight-1': 'sounds/boxwood/move-knight-1.ogg',
  'move-opponent-2': 'sounds/boxwood/move-opponent-2.ogg',
  'move-self-2': 'sounds/boxwood/move-self-2.ogg',
  'move-slide-1': 'sounds/boxwood/move-slide-1.ogg',
  'capture-1': 'sounds/boxwood/capture-1.ogg',
  'capture-slide-1': 'sounds/boxwood/capture-slide-1.ogg',
};

/** Ascent's sound of a move, Black's a little lower and softer, as in a game seen as White. */
function playAscent(move: Step): void {
  const black = move.color === 'black';
  const options = {
    volume: black ? 0.7 : 1,
    pitch: pitchFor(move.to, move.color) - (black ? 3 : 0),
  };
  if (move.role === 'bishop') play('swoosh', options);
  else playSpec(PIECE_SPECS[move.role], { ...options, id: move.role });
  if (move.capture) playSpec(IMPACT, { ...options, id: 'impact' });
}

function playBoxwood(move: Step): void {
  const file = TAKES[move.take];
  if (file) void new Audio(file).play().catch(() => undefined);
}

const SETS: Readonly<Record<string, (move: Step) => void>> = {
  boxwood: playBoxwood,
  ascent: playAscent,
};

export function startSounds(): void {
  const buttons = queryAll(document, '[data-sound-set]', HTMLButtonElement);
  let timers: number[] = [];
  document.addEventListener('click', event => {
    const button = closestTo(event.target, '[data-sound-set]', HTMLButtonElement);
    const playMove = SETS[button?.dataset.soundSet ?? ''];
    if (!button || !playMove) return;
    // One set at a time: a click stops the one playing.
    for (const timer of timers) window.clearTimeout(timer);
    const wasPlaying = button.dataset.playing !== undefined;
    for (const other of buttons) delete other.dataset.playing;
    timers = [];
    if (wasPlaying) return;
    button.dataset.playing = '';
    timers = OPERA.map((move, i) => window.setTimeout(() => playMove(move), i * STEP_MS));
    timers.push(window.setTimeout(() => delete button.dataset.playing, OPERA.length * STEP_MS));
  });
}
