import { describe, expect, it } from 'vitest';
import { topRating, UserSchema } from './top-rating.ts';

// Lichess's `/api/user/<name>`, cut to what's read.
const user = (perfs: Record<string, unknown>) => UserSchema.parse({ perfs });

describe('topRating', () => {
  it('takes the speed with the most games, not puzzles', () => {
    expect(
      topRating(
        user({
          blitz: { games: 25, rating: 1584, prov: true },
          rapid: { games: 78, rating: 1673 },
          classical: { games: 1, rating: 1695, prov: true },
          puzzle: { games: 671, rating: 2183 },
        }),
      ),
    ).toEqual({ speed: 'rapid', rating: 1673, provisional: false });
  });

  it('keeps the first speed on a tie, and says when the rating is provisional', () => {
    expect(
      topRating(
        user({ bullet: { games: 3, rating: 1400, prov: true }, blitz: { games: 3, rating: 1500 } }),
      ),
    ).toEqual({ speed: 'bullet', rating: 1400, provisional: true });
  });

  it('gives null before any game', () => {
    expect(topRating(user({ blitz: { games: 0, rating: 1500, prov: true } }))).toBeNull();
  });
});
