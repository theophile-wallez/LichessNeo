import { z } from 'zod/mini';

// The kinds of drawing the review's coach puts on the board, which the
// settings show or hide one by one, and the page world filters its drawing by.

export const DRAWING_TOPICS = [
  'mates',
  'forks',
  'pins',
  'lines',
  'hanging',
  'checks',
  'threats',
  'plans',
  'pawns',
  'endings',
] as const;

export const DrawingTopicSchema = z.enum(DRAWING_TOPICS);
export type DrawingTopic = z.infer<typeof DrawingTopicSchema>;

/** The kinds the user hid. One unknown, kept by a later version, hides none rather than all. */
export const HiddenDrawingsSchema = z.catch(z.array(DrawingTopicSchema), []);

/** Whether the coach draws a drawing of `topic`: its drawings on, and that kind not hidden. */
export const drawsTopic = (
  { board, hidden }: { readonly board: boolean; readonly hidden: readonly DrawingTopic[] },
  topic: DrawingTopic,
): boolean => board && !hidden.includes(topic);
