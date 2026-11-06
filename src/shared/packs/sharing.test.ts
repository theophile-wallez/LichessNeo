import { describe, expect, it } from 'vitest';
import { packRepoName } from './sharing.ts';

describe('packRepoName', () => {
  it('joins the words of the name after the prefix', () => {
    expect(packRepoName('Warm wood')).toBe('LichessNeoPack_WarmWood');
    expect(packRepoName('neon-glass 2')).toBe('LichessNeoPack_NeonGlass2');
  });

  it('keeps only what GitHub takes in a name', () => {
    expect(packRepoName("Bois d'été")).toBe('LichessNeoPack_BoisDEte');
    expect(packRepoName('  ♞ ✦ ')).toBe('LichessNeoPack_Pack');
  });

  it('keeps the letters it is given in their case', () => {
    expect(packRepoName('myGreatSET')).toBe('LichessNeoPack_MyGreatSET');
  });
});
