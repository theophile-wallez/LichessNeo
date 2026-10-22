import { z } from 'zod/mini';

// The answer Lichess POSTs to /insights/data/<user>. A dataType stays a plain
// string: a new one must format as a number, not fail the whole answer.

const SerieSchema = z.object({
  name: z.string(),
  dataType: z.string(),
  // The series of a stacked metric (a game's results, its terminations) name a shared stack.
  stack: z.optional(z.string()),
  data: z.array(z.number()),
});

const YAxisSchema = z.object({ name: z.string(), dataType: z.string() });

export const AnswerSchema = z.object({
  question: z.object({ metric: z.string(), dimension: z.string() }),
  xAxis: z.object({
    name: z.string(),
    // A text dimension's names, or a date's seconds since the epoch.
    categories: z.array(z.union([z.string(), z.number()])).check(z.minLength(1)),
    dataType: z.string(),
  }),
  valueYaxis: YAxisSchema,
  sizeYaxis: YAxisSchema,
  series: z.array(SerieSchema).check(z.minLength(1)),
  // How many games or moves each category stands on.
  sizeSerie: SerieSchema,
});

export type Answer = z.infer<typeof AnswerSchema>;
export type Serie = z.infer<typeof SerieSchema>;
