import { describe, expect, it } from 'vitest';
import { scaleRadii } from './css-roundness.ts';

const scaled = (amount: string): string => `calc(var(--ln-ext-radius-px) * ${amount})`;

describe('scaleRadii', () => {
  it('scales every corner written in px', () => {
    expect(scaleRadii('.a {\n  border-radius: 12px 6.5px 0 0 !important;\n}')).toBe(
      `.a {\n  border-radius: ${scaled('12')} ${scaled('6.5')} 0 0 !important;\n}`,
    );
  });

  it('scales the longhands and our radius variables, fallbacks included', () => {
    expect(scaleRadii('.a{border-top-left-radius:4px;--ln-ext-tab-radius: 8px}')).toBe(
      `.a{border-top-left-radius:${scaled('4')};--ln-ext-tab-radius: ${scaled('8')}}`,
    );
    expect(scaleRadii('.a { border-radius: var(--ln-ext-tab-radius, 7px); }')).toBe(
      `.a { border-radius: var(--ln-ext-tab-radius, ${scaled('7')}); }`,
    );
  });

  it('keeps pills, circles and zeros as they are', () => {
    const css =
      '.a { border-radius: 999px; } .b { border-radius: 50%; } .c { border-radius: 0px; }';
    expect(scaleRadii(css)).toBe(css);
  });

  it('leaves other properties alone', () => {
    const css = '.a { padding: 12px; --ln-ext-radius-px: calc(var(---ui-roundness, 8px) / 8); }';
    expect(scaleRadii(css)).toBe(css);
  });
});
