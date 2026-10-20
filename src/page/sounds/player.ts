import { SOUND_NAMES, type SoundName } from '#shared/sounds.ts';
import {
  readMoveOptions,
  soundVolume,
  type MoveOptions,
  type PlaySound,
  type SoundPlayer,
} from '#page/lichess/sound.ts';
import { boardOrientation, mainBoardWrap, readBoard } from './board-reader.ts';
import {
  fallbackSound,
  standIn,
  soundForLichessEvent,
  soundFromBoard,
  soundFromSan,
} from './choose.ts';
import { watchJumps, type JumpSounds } from './jumps.ts';
import type { SoundSession } from './session.ts';
import type { Synth } from './synth/synth.ts';
import { PREFIX } from '#shared/prefix.ts';

// A pack's sounds go into Lichess's player under their own names, and its `play()`,
// `move()` and `saySan()` are wrapped so each event picks the matching one. The
// extension's own set plays every one itself. Both change with the pick: with
// neither, every call goes to Lichess.

const NAME_PREFIX = `${PREFIX}-`;
// Our own moves reach the server, and come back with their SAN, only after
// the board sound: a SAN this fresh is the move being played now.
const FRESH_SAN_MS = 300;

interface ServerMove {
  readonly san: string;
  readonly ply: number | undefined;
  readonly at: number;
}

type PlayOurs = (name: SoundName, volume: unknown) => unknown;
/** Plays a move's sound; `captured` picks the stand-in for one the pack lacks. */
type PlayMove = (name: SoundName, volume: unknown, captured: boolean) => unknown;

interface Hook {
  readonly sound: SoundPlayer;
  /** Whether we have our own sound for `name`. */
  readonly has: (name: SoundName) => boolean;
  /** Whether we play any: none leaves every call to Lichess. */
  readonly active: () => boolean;
  readonly session: SoundSession;
  readonly playOurs: PlayOurs;
  readonly playLichess: PlaySound;
  readonly playMove: PlayMove;
  readonly jumps: JumpSounds;
}

// Keeps the position the next move is compared with, once the board is redrawn.
function rememberBoard(session: SoundSession): void {
  requestAnimationFrame(() => {
    session.lastPieces = readBoard(mainBoardWrap())?.pieces ?? session.lastPieces;
  });
}

function soundAfterBoardMove(session: SoundSession, lichessName: string | undefined): SoundName {
  const state = readBoard(mainBoardWrap());
  if (!state) return fallbackSound(lichessName);
  const before = session.lastPieces;
  session.lastPieces = state.pieces;
  return soundFromBoard({ before, ...state, lichessName, orientation: boardOrientation() });
}

function hookPlay({ sound, has, playOurs, playLichess }: Hook): void {
  sound.play = (name: unknown, volume: unknown = 1): unknown => {
    if (typeof name === 'string' && !name.startsWith(NAME_PREFIX)) {
      // Our one check sound comes from move(). Lichess plays its own check and
      // mate sounds just before an opponent's move, or on the echo of ours.
      const ownCheck = name === 'check' || name === 'checkmate';
      if (ownCheck && has('move-check')) return Promise.resolve();
      const ours = soundForLichessEvent(name);
      if (ours && has(ours)) return playOurs(ours, volume);
    }
    return playLichess(name, volume);
  };
}

function hookMove(hook: Hook): void {
  const { sound, session, playMove, jumps } = hook;
  const moveLichess = sound.move.bind(sound);
  let serverMove: ServerMove | null = null;

  const playSan = (san: string, ply: number | undefined, volume: unknown): unknown => {
    rememberBoard(session);
    return playMove(soundFromSan(san, ply, boardOrientation()), volume, san.includes('x'));
  };
  // Board moves on the game page, and drops (no argument).
  const playBoardMove = ({ name }: MoveOptions, volume: unknown): unknown => {
    const recent = serverMove;
    serverMove = null;
    if (recent && Date.now() - recent.at < FRESH_SAN_MS)
      return playSan(recent.san, recent.ply, volume);
    session.lastMoveSoundAt = Date.now();
    jumps.moved();
    // The board is redrawn on the next frame: read it after that.
    requestAnimationFrame(() =>
      playMove(soundAfterBoardMove(session, name), volume, name === 'capture'),
    );
    return Promise.resolve();
  };

  sound.move = (options?: unknown): unknown => {
    if (!hook.active()) return moveLichess(options);
    const move = readMoveOptions(options);
    // The game page passes each server move here with its SAN (filter "music"),
    // just before chessground asks for the board sound: SAN says exactly what it was.
    if (move.filter === 'music' && move.san)
      serverMove = { san: move.san, ply: move.ply, at: Date.now() };
    // Pentatonic, Lichess's 'music' theme, plays its notes on these, which ours replace; the
    // other themes play nothing on them.
    if (move.filter === 'music')
      return sound.theme === 'music' ? Promise.resolve() : moveLichess(options);
    const volume = move.volume ?? 1;
    if (move.san) return playSan(move.san, move.ply, volume);
    if (!move.name || move.name === 'move' || move.name === 'capture')
      return playBoardMove(move, volume);
    return moveLichess(options);
  };
}

// Lichess passes `cut` when a jump has the SAN spoken, not when a move is played.
function hookSaySan({ sound, active, jumps }: Hook): void {
  const { saySan } = sound;
  if (!saySan) return;
  const sayLichess = saySan.bind(sound);
  sound.saySan = (san, cut, force): unknown => {
    if (cut === true && active()) jumps.jumped(typeof san === 'string' ? san : undefined);
    return sayLichess(san, cut, force);
  };
}

/** Points our names in Lichess's player at `urls`, which its cache keys by. */
export function setSoundPaths(sound: SoundPlayer, urls: ReadonlyMap<SoundName, string>): void {
  for (const name of SOUND_NAMES) {
    const url = urls.get(name);
    if (url === undefined) sound.paths.delete(NAME_PREFIX + name);
    else sound.paths.set(NAME_PREFIX + name, url);
  }
}

const volumeOf = (volume: unknown): number => (typeof volume === 'number' ? volume : 1);

/**
 * Adds a pack's sounds to Lichess's player and wraps its methods, once per page;
 * `synth` is the extension's own set while it's picked. Returns false when
 * another copy of this script got there first.
 */
export function hookSoundPlayer(
  sound: SoundPlayer,
  urls: ReadonlyMap<SoundName, string>,
  session: SoundSession,
  synth: () => Synth | null = () => null,
): boolean {
  for (const [name, url] of urls) sound.paths.set(NAME_PREFIX + name, url);
  if (sound.lnExtHooked) return false;
  sound.lnExtHooked = true;
  const playLichess = sound.play.bind(sound);
  const playOurs: PlayOurs = (name, volume) => {
    const live = synth();
    if (!live) return urls.has(name) ? playLichess(NAME_PREFIX + name, volume) : undefined;
    live.play(name, soundVolume(sound) * volumeOf(volume));
    return Promise.resolve();
  };
  const playMove: PlayMove = (name, volume, captured) => {
    session.lastMoveSoundAt = Date.now();
    jumps.moved();
    const { ours, lichess } = standIn(captured);
    return playOurs(name, volume) ?? playOurs(ours, volume) ?? playLichess(lichess, volume);
  };
  const jumps = watchJumps(session, name => playMove(name, undefined, name === 'capture'));
  const has = (name: SoundName): boolean => synth() !== null || urls.has(name);
  const active = (): boolean => synth() !== null || urls.size > 0;
  const hook: Hook = { sound, has, active, session, playOurs, playLichess, playMove, jumps };
  hookPlay(hook);
  hookMove(hook);
  hookSaySan(hook);
  session.playOurs = name => playOurs(name, undefined);
  return true;
}
