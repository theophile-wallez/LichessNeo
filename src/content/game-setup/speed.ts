// A clock's speed as Lichess files it (lila's Speed): by its estimated length, the
// initial time plus forty moves' increments.

export type Speed = 'ultrabullet' | 'bullet' | 'blitz' | 'rapid' | 'classical';

/** The longest estimate, in seconds, of each speed but the last. */
const LIMITS: readonly (readonly [number, Speed])[] = [
  [29, 'ultrabullet'],
  [179, 'bullet'],
  [479, 'blitz'],
  [1499, 'rapid'],
];

/** Each speed's Lichess glyph, as `[data-icon]` takes it (styles/theme/game-modes.css). */
export const SPEED_GLYPHS: Readonly<Record<Speed, string>> = {
  ultrabullet: '\ue059',
  bullet: '\ue032',
  blitz: '\ue008',
  rapid: '\ue002',
  classical: '\ue00a',
};

export const CORRESPONDENCE_GLYPH = '\ue019';

export function speedOf(minutes: number, increment: number): Speed {
  const estimate = minutes * 60 + increment * 40;
  return LIMITS.find(([limit]) => estimate <= limit)?.[1] ?? 'classical';
}

// The setup writes a quarter, a half and three quarters of a minute as fractions.
const FRACTIONS: ReadonlyMap<string, number> = new Map([
  ['¼', 0.25],
  ['½', 0.5],
  ['¾', 0.75],
]);

/** Minutes as the setup writes them ("5", "½", "1.5"); null for anything else. */
export function parseMinutes(text: string): number | null {
  const trimmed = text.trim();
  const fraction = FRACTIONS.get(trimmed);
  if (fraction !== undefined) return fraction;
  const minutes = Number(trimmed);
  return trimmed !== '' && Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
}

/** The speed of a preset ("3+2"); null for anything else. */
export function presetSpeed(text: string): Speed | null {
  const match = /^\s*([\d.¼½¾]+)\s*\+\s*(\d+)\s*$/.exec(text);
  const minutes = match ? parseMinutes(match[1] ?? '') : null;
  return match && minutes !== null ? speedOf(minutes, Number(match[2])) : null;
}
