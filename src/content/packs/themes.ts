import type { PartKind } from '#shared/packs/pack.ts';
import { BACKLIT, BACKLIT_BOARDS } from '#shared/backlit.ts';
import { SYNTH_SET } from '#shared/sounds.ts';

// The extension's own looks for each part: its boards, drawn by its CSS from
// `data-lr-ext-board` on <html> (styles/board/), the backlit ones lit up in the
// page (page/backlit), and its sound set, synthesized in the page
// (page/sounds/synth). A part's pick is one of these,
// an imported pack or Lichess's own.

export interface Theme {
  readonly id: string;
  readonly name: string;
  /** The family it's listed in, under one tile of its panel, with the settings it shares. */
  readonly family?: string;
}

export interface Family {
  readonly id: string;
  readonly name: string;
}

export const FAMILIES: readonly Family[] = [{ id: BACKLIT, name: 'Backlit' }];

export const THEMES: Readonly<Record<PartKind, readonly Theme[]>> = {
  board: [
    { id: 'blue', name: 'Blue' },
    ...BACKLIT_BOARDS.map(({ id, name }) => ({ id, name, family: BACKLIT })),
  ],
  piece: [],
  sound: [{ id: SYNTH_SET, name: 'Foley' }],
};

export const isTheme = (kind: PartKind, id: string): boolean =>
  THEMES[kind].some(theme => theme.id === id);

/** The family of the theme `id`, if it's one of a family's. */
export const familyOf = (kind: PartKind, id: string): string | null =>
  THEMES[kind].find(theme => theme.id === id)?.family ?? null;
