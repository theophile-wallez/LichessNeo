import type { z } from 'zod/mini';
import { readStored, writeStored } from '#shared/storage.ts';

// A setting one of the extension's themes offers in its panel, under the
// theme's tile (options.ts). Kept in localStorage beside the picks.

export interface StoredOption<T extends string> {
  readonly read: () => T;
  readonly choose: (value: T) => void;
  readonly onChange: (listener: (value: T) => void) => void;
}

export function storedOption<T extends string>(
  key: string,
  schema: z.ZodMiniType<T>,
  fallback: T,
): StoredOption<T> {
  const listeners = new Set<(value: T) => void>();
  return {
    read: () => readStored(key, schema) ?? fallback,
    choose(value) {
      writeStored(key, value);
      for (const listener of listeners) listener(value);
    },
    onChange: listener => listeners.add(listener),
  };
}
