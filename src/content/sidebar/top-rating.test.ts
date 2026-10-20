import { describe, expect, it } from 'vitest';
import { pickedRating, ratingsOf, topRating, UserSchema } from './top-rating.ts';

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

describe('pickedRating', () => {
  const profile = user({
    blitz: { games: 25, rating: 1584, prov: true },
    rapid: { games: 78, rating: 1673 },
  });
  const top = topRating(profile);

  it('shows the most played speed by default, or the speed picked', () => {
    expect(pickedRating(top, ratingsOf(profile), 'mostPlayed')).toEqual(top);
    expect(pickedRating(top, ratingsOf(profile), 'blitz')).toEqual({
      speed: 'blitz',
      rating: 1584,
      provisional: true,
    });
  });

  it('falls back to the most played one for a speed without a rating, or ratings kept before', () => {
    expect(pickedRating(top, ratingsOf(profile), 'classical')).toEqual(top);
    expect(pickedRating(top, undefined, 'blitz')).toEqual(top);
  });

  it('shows none once hidden', () => {
    expect(pickedRating(top, ratingsOf(profile), 'hidden')).toBeNull();
  });
});
