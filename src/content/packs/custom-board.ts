import { z } from 'zod/mini';
import { setStyleProperty } from '#shared/dom.ts';
import { readStoredJson, StorageKey, writeStoredJson } from '#shared/storage.ts';

// The custom board's two colors, picked under its tile (color-row.ts), and
// drawn by styles/board/pieces.css from variables on <html>, until the user
// saves it under a name (saved-boards.ts).

export const HexSchema = z.string().check(z.regex(/^#[0-9a-f]{6}$/i));

const CustomBoardSchema = z.object({ light: HexSchema, dark: HexSchema });

export type SquareColors = z.infer<typeof CustomBoardSchema>;
export type SquareShade = keyof SquareColors;

/** White and our first blue, until the user picks theirs. */
export const DEFAULT_CUSTOM_BOARD: SquareColors = { light: '#f7f8f8', dark: '#5e6ad2' };

/** Whether `value` is a color the board keeps: `#rrggbb`, as a color input gives it. */
export const isHexColor = (value: string): boolean => HexSchema.safeParse(value).success;

const listeners = new Set<() => void>();

export function readCustomBoard(): SquareColors {
  return readStoredJson(StorageKey.customBoard, CustomBoardSchema) ?? DEFAULT_CUSTOM_BOARD;
}

export function showCustomBoard(): void {
  const { light, dark } = readCustomBoard();
  const root = document.documentElement;
  setStyleProperty(root, '--ln-ext-board-custom-light', light);
  setStyleProperty(root, '--ln-ext-board-custom-dark', dark);
}

export function chooseSquareColor(shade: SquareShade, color: string): void {
  writeStoredJson(StorageKey.customBoard, { ...readCustomBoard(), [shade]: color.toLowerCase() });
  showCustomBoard();
  for (const listener of listeners) listener();
}

/** Calls `listener` on each change, until the function it returns is called. */
export function onCustomBoardChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
