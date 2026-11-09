import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cssRules } from '#shared/testing/stylesheets.ts';

// A pick made at random (the host's color, a coach) is drawn with Hugeicons' shuffle,
// never a die: dice stand for the variants.
const STYLES = import.meta.dirname;
const HUGEICON = /img\/hugeicons\/([\w-]+)\.svg/g;

function randomRuleIcons(): string[] {
  const files = readdirSync(STYLES, { recursive: true, encoding: 'utf8' }).filter(file =>
    file.endsWith('.css'),
  );
  return files.flatMap(file =>
    cssRules(readFileSync(join(STYLES, file), 'utf8'))
      .filter(rule => rule instanceof CSSStyleRule && rule.selectorText.includes('random'))
      .flatMap(rule => [...rule.cssText.matchAll(HUGEICON)].map(match => `${file}: ${match[1]}`)),
  );
}

describe('a random pick', () => {
  it('draws the shuffle icon', () => {
    const icons = randomRuleIcons();
    expect(icons.length).toBeGreaterThan(0);
    expect(icons.filter(icon => !icon.endsWith(': shuffle'))).toEqual([]);
  });
});
