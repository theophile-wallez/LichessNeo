import { z } from 'zod/mini';
import { type PositionRecord, PositionRecordSchema } from './score.ts';

// A position's record as the review's cache stores it, under the original
// script's short keys, so the caches it wrote still read. The recorded
// fixtures of the original are in this format too.

const StoredFields = {
  wp: z.number(),
  wp2: z.nullable(z.number()),
  best: z.nullable(z.string()),
  // The line, its moves joined by spaces: new to this script.
  pv: z.optional(z.string()),
};

// Zod writes an object's keys in its shape's order, the original's here: a
// record written back is the same text.
export const StoredRecordSchema = z.union([
  z.object({ cp: z.number(), ...StoredFields }),
  z.object({ mate: z.number(), ...StoredFields }),
]);
type StoredRecord = z.infer<typeof StoredRecordSchema>;

function decode(stored: StoredRecord): PositionRecord {
  const fields = {
    whiteWinChance: stored.wp,
    secondLineWinChance: stored.wp2,
    best: stored.best,
    ...(stored.pv === undefined ? {} : { line: stored.pv.split(' ') }),
  };
  return 'mate' in stored ? { mate: stored.mate, ...fields } : { cp: stored.cp, ...fields };
}

function encode(record: PositionRecord): StoredRecord {
  const fields = {
    wp: record.whiteWinChance,
    wp2: record.secondLineWinChance,
    best: record.best,
    ...(record.line === undefined ? {} : { pv: record.line.join(' ') }),
  };
  return 'mate' in record ? { mate: record.mate, ...fields } : { cp: record.cp, ...fields };
}

/** Reads a stored record as the review's own; `z.encode` writes one back. */
export const StoredRecordCodec = z.codec(StoredRecordSchema, PositionRecordSchema, {
  decode,
  encode,
});
