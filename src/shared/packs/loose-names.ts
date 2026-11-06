import type { PieceName } from './pack.ts';
import { SOUND_NAMES, type SoundName } from '#shared/sounds.ts';

// What a loose file is, from its name: a piece (wK … bP, white-king, or
// Wikimedia's Chess_klt45), a sound by what it plays, or else just an image.

const IMAGE = /\.(svg|png|webp|jpe?g|gif|avif)$/i;
const SOUND = /\.(mp3|ogg|oga|wav)$/i;

export type FileType = 'image' | 'sound' | 'other';

export function fileType(path: string): FileType {
  if (IMAGE.test(path)) return 'image';
  return SOUND.test(path) ? 'sound' : 'other';
}

/** The name without its folder nor its extension. */
export const baseName = (path: string): string =>
  (path.split('/').at(-1) ?? path).replace(/\.[^.]*$/, '');

/** The folder a path is in, '' at the root, else ending in a slash. */
export const folderOf = (path: string): string => path.slice(0, path.lastIndexOf('/') + 1);

// Maps, not objects: a file named `constructor` must find nothing.
const ROLES: ReadonlyMap<string, string> = new Map([
  ['king', 'K'],
  ['queen', 'Q'],
  ['rook', 'R'],
  ['bishop', 'B'],
  ['knight', 'N'],
  ['pawn', 'P'],
]);

const SIDES: ReadonlyMap<string, string> = new Map([
  ['white', 'w'],
  ['black', 'b'],
]);

const isPieceName = (name: string): name is PieceName => /^[wb][KQRBNP]$/.test(name);

function pieceFromWords(first: string, second: string): string | null {
  const [color, role] = ROLES.has(first) ? [second, first] : [first, second];
  const side = SIDES.get(color);
  const letter = ROLES.get(role);
  return side === undefined || letter === undefined ? null : `${side}${letter}`;
}

/** The piece a file stands for, or null. */
export function pieceOfFile(path: string): PieceName | null {
  const base = baseName(path).toLowerCase();
  const letters = /^([wb])([kqrbnp])$/.exec(base);
  // Wikimedia Commons' sets: k for king, l for light (white), d for dark.
  const wikimedia = /^chess_([kqrbnp])([ld])t\d*$/.exec(base);
  const words = /^([a-z]+)[-_ ]?([a-z]+)$/.exec(base);
  let name: string | null = null;
  if (letters) name = `${letters[1]}${letters[2]?.toUpperCase()}`;
  else if (wikimedia) name = `${wikimedia[2] === 'l' ? 'w' : 'b'}${wikimedia[1]?.toUpperCase()}`;
  else if (words) name = pieceFromWords(words[1] ?? '', words[2] ?? '');
  return name !== null && isPieceName(name) ? name : null;
}

const squeezed = (name: string): string => name.toLowerCase().replace(/[^a-z\d]/g, '');

// Other names sets give their sounds, Lichess's own among them.
const ALIASES: ReadonlyMap<string, SoundName> = new Map<string, SoundName>([
  ['move', 'move-self'],
  ['check', 'move-check'],
  ['castling', 'castle'],
  ['promotion', 'promote'],
  ['error', 'illegal'],
  ['genericnotify', 'notify'],
  ['notification', 'notify'],
  ['lowtime', 'tenseconds'],
  ['start', 'game-start'],
  ['end', 'game-end'],
]);

/** The sound a file plays, or null. */
export function soundOfFile(path: string): SoundName | null {
  const name = squeezed(baseName(path));
  return SOUND_NAMES.find(sound => squeezed(sound) === name) ?? ALIASES.get(name) ?? null;
}

/** Whether a file is the user's: not a hidden one, nor what macOS adds to a zip. */
export const isVisible = (path: string): boolean =>
  path.split('/').every(part => !part.startsWith('.') && part !== '__MACOSX');
