import type { PartKind } from '#shared/packs/pack.ts';

// The extension's own looks for each part, drawn by its CSS from
// `data-cdc-board` on <html> (styles/board/pieces.css). A part's pick is one
// of these, an imported pack or Lichess's own.

export interface Theme {
  readonly id: string;
  readonly name: string;
}

export const THEMES: Readonly<Record<PartKind, readonly Theme[]>> = {
  board: [{ id: 'blue', name: 'Blue' }],
  piece: [],
  sound: [],
};

export const isTheme = (kind: PartKind, id: string): boolean =>
  THEMES[kind].some(theme => theme.id === id);
