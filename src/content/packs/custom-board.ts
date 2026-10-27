import { z } from 'zod/mini';
import { setStyleProperty } from '#shared/dom.ts';
import { onStoredElsewhere, readStoredJson, StorageKey, writeStoredJson } from '#shared/storage.ts';
import { warmTexture } from './texture-warm.ts';
import { FULL_STRENGTH, showTexture, type TextureId, TexturingSchema } from './textures.ts';

// The custom board's two colors, picked under its tile (color-row.ts), and the
// texture laid over them (texture-row.ts), drawn by styles/board/pieces.css
// from variables on <html>, until the user saves it under a name
// (saved-boards.ts).

export const HexSchema = z.string().check(z.regex(/^#[0-9a-f]{6}$/i));

const SquareColorsSchema = z.object({ light: HexSchema, dark: HexSchema });

export const CustomBoardSchema = z.object({
  ...SquareColorsSchema.shape,
  ...TexturingSchema.shape,
});

export type SquareColors = z.infer<typeof SquareColorsSchema>;
export type SquareShade = keyof SquareColors;
/** A two-tone board's look: its squares' colors, and its texture if it has one. */
export type CustomBoard = z.infer<typeof CustomBoardSchema>;

/** White and our first blue, until the user picks theirs. */
export const DEFAULT_CUSTOM_BOARD: SquareColors = { light: '#f7f8f8', dark: '#5e6ad2' };

/** Whether `value` is a color the board keeps: `#rrggbb`, as a color input gives it. */
export const isHexColor = (value: string): boolean => HexSchema.safeParse(value).success;

const listeners = new Set<() => void>();

export function readCustomBoard(): CustomBoard {
  return readStoredJson(StorageKey.customBoard, CustomBoardSchema) ?? DEFAULT_CUSTOM_BOARD;
}

export function showCustomBoard(): void {
  const board = readCustomBoard();
  const root = document.documentElement;
  setStyleProperty(root, '--ln-ext-board-custom-light', board.light);
  setStyleProperty(root, '--ln-ext-board-custom-dark', board.dark);
  showTexture(root, 'board-custom', board);
  warmTexture(board.texture);
}

function changed(): void {
  showCustomBoard();
  for (const listener of listeners) listener();
}

function write(board: CustomBoard): void {
  writeStoredJson(StorageKey.customBoard, board);
  changed();
}

/** Shows the board, then again each time another tab changes it. */
export function followCustomBoard(): void {
  showCustomBoard();
  onStoredElsewhere([StorageKey.customBoard], changed);
}

export function chooseSquareColor(shade: SquareShade, color: string): void {
  write({ ...readCustomBoard(), [shade]: color.toLowerCase() });
}

/** Lays `texture` over the colors, or none for undefined. */
export function chooseTexture(texture: TextureId | undefined): void {
  const { light, dark, strength } = readCustomBoard();
  write({
    light,
    dark,
    ...(texture !== undefined && { texture }),
    ...(strength !== undefined && { strength }),
  });
}

export const customStrength = (): number => readCustomBoard().strength ?? FULL_STRENGTH;

export function chooseStrength(strength: number): void {
  write({ ...readCustomBoard(), strength });
}

/** Calls `listener` on each change, until the function it returns is called. */
export function onCustomBoardChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
