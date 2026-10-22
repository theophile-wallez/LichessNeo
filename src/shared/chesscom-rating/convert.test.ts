import { describe, expect, it } from 'vitest';
import {
  chesscomRating,
  chesscomRatingChange,
  conversionModel,
  type ConversionModel,
} from './convert.ts';

const MODEL: ConversionModel = {
  fitted: '2026-10',
  speeds: {
    blitz: [
      [1000, 500, 60],
      [1500, 1100, 80],
      [2000, 1900, 100],
    ],
  },
};

describe('the Chess.com equivalent', () => {
  it('reads a rating between two rows off the line joining them', () => {
    expect(chesscomRating('blitz', 1500, MODEL)).toEqual({ rating: 1100, spread: 80 });
    expect(chesscomRating('blitz', 1250, MODEL)).toEqual({ rating: 800, spread: 70 });
    expect(chesscomRating('blitz', 1750, MODEL)).toEqual({ rating: 1500, spread: 90 });
  });

  it('goes on at the end’s slope past the table, its spread the end’s', () => {
    expect(chesscomRating('blitz', 2100, MODEL)).toEqual({ rating: 2060, spread: 100 });
    expect(chesscomRating('blitz', 900, MODEL)).toEqual({ rating: 380, spread: 60 });
  });

  it('never goes below Chess.com’s floor', () => {
    expect(chesscomRating('blitz', 400, MODEL)?.rating).toBe(100);
  });

  it('has none for a speed without a table', () => {
    expect(chesscomRating('ultraBullet', 1500, MODEL)).toBeNull();
    expect(chesscomRating('chess960', 1500, MODEL)).toBeNull();
    expect(chesscomRating('rapid', 1500, MODEL)).toBeNull();
  });

  it('ships a model of rising tables for the speeds both sites play', () => {
    const { speeds } = conversionModel();
    for (const speed of ['bullet', 'blitz', 'rapid'] as const) {
      const rows = speeds[speed] ?? [];
      expect(rows.length).toBeGreaterThan(10);
      for (let i = 1; i < rows.length; i += 1) {
        const [low, high] = [rows[i - 1], rows[i]];
        expect(high?.[0]).toBeGreaterThan(low?.[0] ?? Infinity);
        expect(high?.[1]).toBeGreaterThanOrEqual(low?.[1] ?? Infinity);
      }
    }
  });
});

describe('a change of rating on Chess.com', () => {
  it('is the gap between its two ratings, each converted, not the change itself', () => {
    // 1000 to 1500 Lichess spans 600 Chess.com points: +50 is worth +60 there.
    expect(chesscomRatingChange('blitz', { before: 1200, after: 1250 }, MODEL)).toBe(60);
    expect(chesscomRatingChange('blitz', { before: 1250, after: 1200 }, MODEL)).toBe(-60);
    // Past 1500 the slope is 1.6.
    expect(chesscomRatingChange('blitz', { before: 1600, after: 1650 }, MODEL)).toBe(80);
  });

  it('never reads as none on Chess.com’s floor, where the scale flattens', () => {
    expect(chesscomRatingChange('blitz', { before: 400, after: 405 }, MODEL)).toBe(1);
    expect(chesscomRatingChange('blitz', { before: 405, after: 400 }, MODEL)).toBe(-1);
    expect(chesscomRatingChange('blitz', { before: 400, after: 400 }, MODEL)).toBe(0);
  });

  it('has none for a speed without a table', () => {
    expect(chesscomRatingChange('rapid', { before: 1500, after: 1510 }, MODEL)).toBeNull();
  });
});
