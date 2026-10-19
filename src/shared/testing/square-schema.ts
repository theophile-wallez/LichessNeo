import { z } from 'zod/mini';
import { isSquare } from '#shared/chess/squares.ts';
import type { Square } from '#shared/chess/types.ts';

/** A square's name ("e4") in a fixture's data. */
export const SquareSchema = z.custom<Square>(value => typeof value === 'string' && isSquare(value));
