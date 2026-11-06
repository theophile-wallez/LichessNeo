import { extensionOf } from './export.ts';
import type { LocalFile } from './local.ts';
import { PIECE_NAMES, type Pack } from './pack.ts';
import { dataUrlBytes } from './sniff.ts';

// An item the user made from their files, as files again: what its import
// dialog opens with when they edit it, each named after its slot.

const fileOf = (name: string, url: string): LocalFile => {
  const bytes = new Uint8Array(dataUrlBytes(url));
  return { path: `${name}${extensionOf(url)}`, size: bytes.length, read: async () => bytes };
};

/** The item's board, pieces or sounds, as files named `board.png`, `wK.svg`, `move-self.mp3`. */
export function itemFiles({ board, pieces, sounds }: Pack): LocalFile[] {
  return [
    ...(board ? [fileOf('board', board.image)] : []),
    ...(pieces ? PIECE_NAMES.map(name => fileOf(name, pieces[name])) : []),
    ...Object.entries(sounds ?? {}).map(([name, url]) => fileOf(name, url)),
  ];
}
