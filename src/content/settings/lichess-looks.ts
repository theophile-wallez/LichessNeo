import { z } from 'zod/mini';
import type { PartKind } from '#shared/packs/pack.ts';

// Lichess's own boards, piece sets and sound sets, as its user menu lists
// them (`/dasher`, lila's ui/dasher), for the settings' Board & sounds page.
// What each part shows is on <body>, which Lichess's menu and ours keep up to date.

const DasherSchema = z.object({
  board: z.object({
    d2: z.object({ list: z.array(z.object({ name: z.string(), file: z.string() })) }),
  }),
  piece: z.object({ d2: z.object({ list: z.array(z.object({ name: z.string() })) }) }),
  // "key Name" each.
  sound: z.object({ list: z.array(z.string()) }),
});

export interface LichessLook {
  readonly id: string;
  readonly name: string;
  /** Its tile's picture, none for a sound set; a piece set's in SVG, which a few have only in WebP. */
  readonly image: string | null;
  /** The picture is the whole board, not its two top-left squares: an SVG board has no thumbnail. */
  readonly whole?: boolean;
}

export type LichessLooks = Readonly<Record<PartKind, readonly LichessLook[]>>;

/** `wood4` → `Wood4`, `blue-marble` → `Blue marble`: the menu shows only the ids. */
export function lookName(id: string): string {
  const words = id.replaceAll('-', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A board's thumbnail beside its file: its two top-left squares. An SVG board has none. */
export function boardThumbnail(file: string): string {
  if (file.endsWith('.svg')) return `images/board/${file}`;
  return `images/board/${file.replace(/\.(\w+)$/, '.thumbnail.$1')}`;
}

/** The lists in `/dasher`'s answer, the pictures under Lichess's `assets` URL. */
export function parseLichessLooks(value: unknown, assets: string): LichessLooks | null {
  const parsed = DasherSchema.safeParse(value);
  if (!parsed.success) return null;
  const { board, piece, sound } = parsed.data;
  return {
    board: board.d2.list.map(({ name, file }) => ({
      id: name,
      name: lookName(name),
      image: `${assets}${boardThumbnail(file)}`,
      whole: file.endsWith('.svg'),
    })),
    piece: piece.d2.list.map(({ name }) => ({
      id: name,
      name: lookName(name),
      image: `${assets}piece/${name}/wN.svg`,
    })),
    sound: sound.list
      .map(entry => entry.split(' '))
      // Speech needs its voice picked, in Lichess's menu.
      .filter(([id]) => id !== undefined && id !== 'speech')
      .map(([id = '', ...name]) => ({ id, name: name.join(' ') || lookName(id), image: null })),
  };
}

const CURRENT_KEYS: Readonly<Record<PartKind, string>> = {
  board: 'board',
  piece: 'pieceSet',
  sound: 'soundSet',
};

/** What Lichess shows for `kind` while the extension leaves the part to it. */
export const lichessCurrent = (kind: PartKind): string | undefined =>
  document.body.dataset[CURRENT_KEYS[kind]];

let loading: Promise<LichessLooks | null> | null = null;

async function fetchLooks(): Promise<LichessLooks | null> {
  const origin = document.body.dataset.assetUrl ?? '';
  if (!origin.startsWith('https://')) return null;
  const response = await fetch('/dasher', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`/dasher answered ${response.status}`);
  return parseLichessLooks(await response.json(), `${origin}/assets/`);
}

/** Lichess's lists, read once; null if they can't be, and read again next time. */
export function readLichessLooks(): Promise<LichessLooks | null> {
  loading ??= fetchLooks().catch((error: unknown) => {
    console.warn('[LichessNeo] Lichess’s boards and sounds', error);
    return null;
  });
  const read = loading;
  return read.then(looks => {
    if (!looks && loading === read) loading = null;
    return looks;
  });
}
