import { afterEach, describe, expect, it } from 'vitest';
import { accuracyDecimals, formatAccuracy, gameOverTexts } from './texts.ts';

afterEach(() => {
  document.documentElement.lang = '';
});

describe('the game over’s words', () => {
  it('writes an accuracy as the page’s language does', () => {
    document.documentElement.lang = 'fr';
    expect(formatAccuracy(87.34)).toBe('87,3 %');
    document.documentElement.lang = 'en-US';
    expect(formatAccuracy(87.34)).toBe('87.3%');
    expect(formatAccuracy(100)).toBe('100%');
  });

  it('rounds an accuracy to the tenth the review shows', () => {
    document.documentElement.lang = 'en-US';
    // 88.85 is a hair under in binary: the review shows 88.8.
    expect(formatAccuracy(88.85)).toBe('88.8%');
    expect(formatAccuracy(82.65)).toBe('82.7%');
  });

  it('keeps the final figure’s tenths while it counts up to it', () => {
    document.documentElement.lang = 'en-US';
    expect(accuracyDecimals(80.5)).toBe(1);
    expect(accuracyDecimals(80.02)).toBe(0);
    expect(formatAccuracy(80, accuracyDecimals(80.5))).toBe('80.0%');
    expect(formatAccuracy(79.96, accuracyDecimals(80))).toBe('80%');
  });

  it('speaks French on a French page, English elsewhere', () => {
    document.documentElement.lang = 'fr';
    expect(gameOverTexts().title('win', 'bob')).toBe('Vous avez battu bob !');
    expect(gameOverTexts().title('loss', 'bob')).toBe('Vous avez perdu');
    document.documentElement.lang = 'de';
    expect(gameOverTexts().title('win', 'bob')).toBe('You beat bob!');
  });

  it('names a count in the singular or the plural, as each language counts', () => {
    document.documentElement.lang = 'fr';
    const fr = gameOverTexts();
    expect([0, 1, 2].map(count => fr.countLabel('miss', count))).toEqual([
      'coup manqué',
      'coup manqué',
      'coups manqués',
    ]);
    document.documentElement.lang = 'en';
    const en = gameOverTexts();
    expect([0, 1, 2].map(count => en.countLabel('best', count))).toEqual([
      'best moves',
      'best move',
      'best moves',
    ]);
  });

  it('has the coach look for the turn only after a loss', () => {
    const { verdict } = gameOverTexts();
    expect(verdict('win', '91%')).toBe('Well played! You played with 91% accuracy.');
    expect(verdict('loss', '64%')).toBe(
      'Not this time! You played with 64% accuracy. Let’s see where it turned.',
    );
    expect(verdict('draw', null)).toBe('A close game! Let’s look at the game together.');
  });
});
