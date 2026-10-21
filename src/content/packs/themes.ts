import type { PartKind } from '#shared/packs/pack.ts';
import { BACKLIT, BACKLIT_BOARDS } from '#shared/backlit.ts';
import { RECORDED_SET } from '#shared/recorded-sounds.ts';
import { SYNTH_SET } from '#shared/sounds.ts';
import type { CustomBoard } from './custom-board.ts';
import { type FlatBoard, PRESET_BOARDS } from './flat-boards.ts';
import { MATERIAL_BOARDS, MATERIALS } from './materials.ts';
import { savedBoards } from './saved-boards.ts';

// The extension's own looks for each part: its boards, drawn by its CSS from
// `data-ln-ext-board` on <html> (styles/board/), the material ones textured
// (materials.ts), the backlit ones lit up in the page (page/backlit), and its sound sets: Ascent, synthesized in the page
// (page/sounds/synth), and Boxwood, recorded (#shared/recorded-sounds.ts). A part's pick is one of these,
// an imported pack or Lichess's own.

export interface Theme {
  readonly id: string;
  readonly name: string;
  /** The family it's listed in, under one tile of its panel, with the settings it shares. */
  readonly family?: string;
  /** A two-tone board's squares and texture, which its tile shows (flat-boards.ts). */
  readonly colors?: CustomBoard;
  /** One the user saved, which they may delete. */
  readonly saved?: boolean;
}

export interface Family {
  readonly id: string;
  readonly name: string;
}

/** Our board in the color theme's accent, and the one the user colors (custom-board.ts). */
export const ACCENT_BOARD = 'accent';
export const CUSTOM_BOARD = 'custom';

export const FAMILIES: readonly Family[] = [
  { id: MATERIALS, name: 'Materials' },
  { id: BACKLIT, name: 'Backlit' },
];

const flat = (
  { id, name, ...look }: FlatBoard,
  listed: Pick<Theme, 'family' | 'saved'> = {},
): Theme => ({ id, name, colors: look, ...listed });

const BOARDS_BEFORE: readonly Theme[] = [
  { id: ACCENT_BOARD, name: 'Accent' },
  ...PRESET_BOARDS.map(board => flat(board)),
];

const BOARDS_AFTER: readonly Theme[] = [
  { id: CUSTOM_BOARD, name: 'Custom' },
  ...MATERIAL_BOARDS.map(board => flat(board, { family: MATERIALS })),
  ...BACKLIT_BOARDS.map(({ id, name }) => ({ id, name, family: BACKLIT })),
];

const THEMES: Readonly<Record<Exclude<PartKind, 'board'>, readonly Theme[]>> = {
  piece: [],
  sound: [
    { id: SYNTH_SET, name: 'Ascent' },
    { id: RECORDED_SET, name: 'Boxwood' },
  ],
};

/** The part's themes, in their order: the boards the user saved come after the presets. */
export function themesOf(kind: PartKind): readonly Theme[] {
  if (kind !== 'board') return THEMES[kind];
  const saved = savedBoards().map(board => flat(board, { saved: true }));
  return [...BOARDS_BEFORE, ...saved, ...BOARDS_AFTER];
}

export const isTheme = (kind: PartKind, id: string): boolean =>
  themesOf(kind).some(theme => theme.id === id);

/** The family of the theme `id`, if it's one of a family's. */
export const familyOf = (kind: PartKind, id: string): string | null =>
  themesOf(kind).find(theme => theme.id === id)?.family ?? null;
