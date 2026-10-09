import { z } from 'zod/mini';
import { ModeSchema } from '#page/review/session.ts';

// What the panel's and the controls' buttons do, named by their `data-lr-ext`:
// a mode to show, or a command on the review.

const CommandSchema = z.enum([
  'play',
  'explain',
  'rows',
  'first',
  'last',
  'prev',
  'next',
  'best',
  'line',
  'coach',
  'jump',
  'moment',
  'learn',
  'chip',
  'retry',
  'reveal',
]);

export const PanelActionSchema = z.union([ModeSchema, CommandSchema]);
export type PanelAction = z.infer<typeof PanelActionSchema>;
