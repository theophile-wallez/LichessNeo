import { z } from 'zod/mini';
import { parseJson } from '#shared/json.ts';
import { pageLang } from '#shared/lang.ts';
import { readStoredJson, StorageKey, writeStoredJson } from '#shared/storage.ts';

// Lichess's user menu (`ui/dasher`) waits on `GET /dasher`, which Cloudflare
// never caches, before drawing a single link. Its lists (languages, boards,
// pieces, sounds) and roles rarely change, and what the page shows now (who is
// signed in, the language, the scheme, the board and the pieces) is already on
// `<html>` and `<body>`. Kept in storage, the last answer serves the menu in
// place while a fresh one updates the cache behind it.

const REFRESH_MS = 10 * 60 * 1000;

const BoardOptionSchema = z.object({
  name: z.string(),
  file: z.optional(z.string()),
  featured: z.boolean(),
});

const DimensionSchema = z.object({
  current: z.string(),
  list: z.array(BoardOptionSchema),
});

const GallerySideSchema = z.object({
  images: z.array(z.string()),
  montage2: z.string(),
  montage4: z.string(),
});

const DasherPayloadSchema = z.object({
  user: z.optional(
    z.object({
      id: z.string(),
      name: z.string(),
      title: z.optional(z.string()),
      flair: z.optional(z.string()),
      patron: z.optional(z.boolean()),
      patronColor: z.optional(z.number()),
    }),
  ),
  lang: z.object({
    current: z.string(),
    accepted: z.array(z.string()),
    list: z.array(z.tuple([z.string(), z.string()])),
  }),
  sound: z.object({ list: z.array(z.string()) }),
  background: z.object({
    current: z.string(),
    image: z.string(),
    gallery: z.optional(
      z.object({
        light: GallerySideSchema,
        dark: GallerySideSchema,
      }),
    ),
  }),
  board: z.object({
    is3d: z.boolean(),
    d2: DimensionSchema,
    d3: DimensionSchema,
  }),
  piece: z.object({
    d2: DimensionSchema,
    d3: DimensionSchema,
  }),
  coach: z.boolean(),
  streamer: z.boolean(),
});

export type DasherPayload = z.infer<typeof DasherPayloadSchema>;

const StoredDasherSchema = z.object({
  user: z.nullable(z.string()),
  at: z.number(),
  data: DasherPayloadSchema,
});

export interface PageDasherState {
  readonly user: string | null;
  readonly lang: string;
  readonly is3d: boolean;
  readonly theme?: string;
  readonly board?: string;
  readonly board3d?: string;
  readonly pieceSet?: string;
  readonly pieceSet3d?: string;
}

/** What `<html>`, `<body>` and `#main-wrap` already say about the user and their picks. */
export function readPageDasherState(): PageDasherState {
  const data = document.body?.dataset;
  const user = data?.user ?? null;
  const is3d = document.getElementById('main-wrap')?.classList.contains('is3d') === true;
  return {
    user,
    lang: pageLang(),
    is3d,
    ...(data?.theme !== undefined && { theme: data.theme }),
    ...(data?.board !== undefined && { board: data.board }),
    ...(data?.board3d !== undefined && { board3d: data.board3d }),
    ...(data?.pieceSet !== undefined && { pieceSet: data.pieceSet }),
    ...(data?.pieceSet3d !== undefined && { pieceSet3d: data.pieceSet3d }),
  };
}

/** Reconciles a cached `/dasher` payload with the current page's live picks. */
export function applyPageState(data: DasherPayload, state: PageDasherState): DasherPayload {
  return {
    ...data,
    lang: state.lang ? { ...data.lang, current: state.lang } : data.lang,
    background:
      state.theme === undefined ? data.background : { ...data.background, current: state.theme },
    board: {
      is3d: state.is3d,
      d2: state.board === undefined ? data.board.d2 : { ...data.board.d2, current: state.board },
      d3:
        state.board3d === undefined ? data.board.d3 : { ...data.board.d3, current: state.board3d },
    },
    piece: {
      d2:
        state.pieceSet === undefined
          ? data.piece.d2
          : { ...data.piece.d2, current: state.pieceSet },
      d3:
        state.pieceSet3d === undefined
          ? data.piece.d3
          : { ...data.piece.d3, current: state.pieceSet3d },
    },
  };
}

export interface KeptDasher {
  readonly data: DasherPayload;
  readonly stale: boolean;
}

/** Reads the cached `/dasher` payload if it belongs to `state.user`, updated for this page. */
export function readKeptDasher(state: PageDasherState): KeptDasher | null {
  try {
    const stored = readStoredJson(StorageKey.dasherCache, StoredDasherSchema);
    if (!stored || stored.user !== state.user) return null;
    if ((stored.data.user?.id ?? null) !== state.user) return null;
    return {
      data: applyPageState(stored.data, state),
      stale: Date.now() - stored.at >= REFRESH_MS,
    };
  } catch {
    return null;
  }
}

/** Validates and stores a `/dasher` JSON text for its own account (or null when signed out). */
export function storeDasherText(text: string): DasherPayload | null {
  const data = parseJson(text, DasherPayloadSchema);
  if (!data) return null;
  writeStoredJson(StorageKey.dasherCache, {
    user: data.user?.id ?? null,
    at: Date.now(),
    data,
  });
  return data;
}
