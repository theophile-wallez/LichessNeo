import type { z } from 'zod/mini';
import { readStored, readStoredJson, writeStored } from '#shared/storage.ts';

// A setting one of the extension's themes offers in its panel, under the
// theme's tile (options.ts). Kept in localStorage beside the picks.

export interface StoredOption<T> {
  readonly read: () => T;
  readonly choose: (value: T) => void;
  readonly onChange: (listener: (value: T) => void) => void;
}

function stored<T extends string | number>(key: string, read: () => T): StoredOption<T> {
  const listeners = new Set<(value: T) => void>();
  return {
    read,
    choose(value) {
      writeStored(key, value);
      for (const listener of listeners) listener(value);
    },
    onChange: listener => listeners.add(listener),
  };
}

export const storedOption = <T extends string>(
  key: string,
  schema: z.ZodMiniType<T>,
  fallback: T,
): StoredOption<T> => stored(key, () => readStored(key, schema) ?? fallback);

/** A number, as a slider sets it (slider-row.ts). */
export const storedNumber = (
  key: string,
  schema: z.ZodMiniType<number>,
  fallback: number,
): StoredOption<number> => stored(key, () => readStoredJson(key, schema) ?? fallback);
