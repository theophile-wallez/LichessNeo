import { z } from 'zod/mini';
import { parseJson } from '#shared/json.ts';
import { CustomThemeSchema, type CustomTheme } from './themes.ts';

// A theme as a code to paste in someone else's settings: its name and
// palettes, as JSON in base64 behind a prefix that says what it is.

const PREFIX = 'lrtheme1:';

const SharedThemeSchema = z.omit(CustomThemeSchema, { id: true });

export type SharedTheme = z.infer<typeof SharedThemeSchema>;

// btoa and atob read bytes as Latin-1: names may hold any character.
const toBase64 = (text: string): string =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)));

function fromBase64(code: string): string | null {
  try {
    return new TextDecoder().decode(Uint8Array.from(atob(code), char => char.charCodeAt(0)));
  } catch {
    return null;
  }
}

export function themeCode({ name, light, dark }: SharedTheme | CustomTheme): string {
  return PREFIX + toBase64(JSON.stringify({ name, light, dark }));
}

/** The theme in a code, or null for anything else. */
export function themeFromCode(code: string): SharedTheme | null {
  const trimmed = code.trim();
  if (!trimmed.startsWith(PREFIX)) return null;
  return parseJson(fromBase64(trimmed.slice(PREFIX.length)), SharedThemeSchema);
}
