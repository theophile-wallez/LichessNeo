// The rating a solved or failed puzzle gave, read from Lichess's side card,
// which shows the rating before the puzzle and the change ("1511 +12").

export interface RatingChange {
  readonly rating: number;
  readonly diff: number;
}

/** The new rating from the side card's text, or null while it shows no change. */
export function parseRatingChange(text: string): RatingChange | null {
  const match = /^\s*(\d+)\s*([+−-])(\d+)/.exec(text);
  if (!match?.[1] || !match[3]) return null;
  const diff = Number(match[3]) * (match[2] === '+' ? 1 : -1);
  if (diff === 0) return null;
  return { rating: Number(match[1]) + diff, diff };
}
