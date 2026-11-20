import { z } from 'zod/mini';

// The colours a win's wave may take, picked in the settings (plan.ts draws
// each): a draw's and a loss's keep theirs, which say the result.

export const WinColorSchema = z.enum(['rainbow', 'green', 'ocean', 'sunset', 'accent']);

export type WinColor = z.infer<typeof WinColorSchema>;

export const DEFAULT_WIN_COLOR: WinColor = 'rainbow';
