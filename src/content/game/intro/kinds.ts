import { z } from 'zod/mini';

// The intros a player may pick in the settings' Play page, or none, in
// the menu's order. The face-off is the first the extension had; each is a
// module of this folder, most with a stylesheet of styles/game/intro (the
// ripple draws the board's wave, content/board-wave).

export const INTRO_KINDS = [
  'off',
  'ripple',
  'salute',
  'setup',
  'march',
  'weave',
  'wave',
  'ticket',
  'camps',
  'credits',
  'faceoff',
] as const;

export const IntroKindSchema = z.enum(INTRO_KINDS);

export type IntroKind = z.infer<typeof IntroKindSchema>;

export const DEFAULT_INTRO: IntroKind = 'off';
