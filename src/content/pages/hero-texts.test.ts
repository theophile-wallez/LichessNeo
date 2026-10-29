import { describe, expect, it } from 'vitest';
import { heroText } from './hero-texts.ts';

describe('heroText', () => {
  it.each(['en', 'fr', 'de', 'es', 'pt'])('greets by name in "%s", each way its own', lang => {
    const lines = heroText(lang).greetings.map(greeting => greeting('Eresy'));
    expect(lines.length).toBeGreaterThan(1);
    expect(new Set(lines).size).toBe(lines.length);
    for (const line of lines) expect(line).toContain('Eresy');
  });
});
