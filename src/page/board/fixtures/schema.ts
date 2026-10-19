import { z } from 'zod/mini';
import { SquareSchema } from '#shared/testing/square-schema.ts';

// The shape of fixtures/legacy.json: what the original script drew.

const PointSchema = z.tuple([z.number(), z.number()]);

const ShapeSchema = z.object({
  tag: z.enum(['circle', 'line']),
  attrs: z.record(z.string(), z.string()),
  hash: z.optional(z.string()),
});

const NodeSchema = z.object({
  id: z.string(),
  ply: z.number(),
  fen: z.string(),
  san: z.optional(z.string()),
  children: z.array(z.unknown()),
});

const FrameSchema = z.object({
  name: z.string(),
  orientation: z.enum(['white', 'black']),
  viewBox: z.optional(z.nullable(z.string())),
  shapes: z.array(ShapeSchema),
  review: z.optional(z.string()),
  reviewArrows: z.optional(
    z.array(
      z.object({ orig: SquareSchema, dest: SquareSchema, brush: z.enum(['best', 'engine']) }),
    ),
  ),
  node: z.optional(NodeSchema),
  laterMs: z.optional(z.number()),
  marks: z.string(),
  layer: z.string(),
  htmlClass: z.string(),
});

export type Frame = z.infer<typeof FrameSchema>;

export const LegacySchema = z.object({
  mateLabel: z.string(),
  frames: z.array(FrameSchema),
  arrows: z.array(z.object({ from: PointSchema, to: PointSchema, markup: z.string() })),
  polygons: z.array(z.object({ points: z.array(PointSchema), polygon: z.string() })),
  centers: z.array(z.object({ square: SquareSchema, white: z.boolean(), center: PointSchema })),
  nodes: z.array(z.object({ node: NodeSchema, king: z.nullable(SquareSchema) })),
});
