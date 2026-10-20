import { beforeEach, describe, expect, it, vi } from 'vitest';
import { perfOfPick, pickDetail, pickName, variantName } from './pairing-names.ts';

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => name } });
});

const custom = (variant: 'standard' | 'kingOfTheHill', rated: boolean) => ({
  custom: {
    variant,
    rated,
    clocks: [
      { minutes: 1, increment: 1 },
      { minutes: 0.5, increment: 0 },
    ],
  },
});

describe('a Quick pairing card’s words', () => {
  it('name a speed’s card by its speed, its pools as the home writes them', () => {
    expect(pickName({ speed: 'bullet' })).toBe('speedBullet');
    expect(pickDetail({ speed: 'bullet' })).toBe('1 min · 2 + 1');
  });

  it('name a card of the player’s own by its rating, then its time controls and mode', () => {
    expect(perfOfPick(custom('standard', true))).toBe('bullet');
    expect(pickName(custom('standard', true))).toBe('speedBullet');
    expect(pickDetail(custom('standard', true))).toBe('1 + 1 · ½ min · pairingRated');
    expect(pickName(custom('kingOfTheHill', false))).toBe('variantKingOfTheHill');
    expect(pickDetail(custom('kingOfTheHill', false))).toMatch(/· pairingCasual$/);
  });

  it('find each variant’s message by its name', () => {
    expect(variantName('threeCheck')).toBe('variantThreeCheck');
  });
});
