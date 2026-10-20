import { describe, expect, it } from 'vitest';
import { mateBadgeMarkup } from './mate-badge.ts';

describe('mateBadgeMarkup', () => {
  it('puts the pip on the king and the crown on the piece that mated it', () => {
    const holder = document.createElement('div');
    holder.innerHTML = mateBadgeMarkup({
      king: { column: 7, row: 0 },
      by: { column: 0, row: 0 },
      label: '"Échec" & mat',
    }).value;
    const badge = holder.querySelector('.ln-ext-mate');
    expect(badge?.getAttribute('style')).toBe('--ln-ext-king-column:7;--ln-ext-king-row:0');
    const crown = badge?.querySelector('.ln-ext-mate__crown');
    expect(crown?.getAttribute('style')).toBe('--ln-ext-by-column:0;--ln-ext-by-row:0');
    expect(crown?.querySelector('svg')).not.toBeNull();
    const pip = badge?.querySelector('.ln-ext-mate__pip');
    expect(pip?.getAttribute('aria-label')).toBe('"Échec" & mat');
    expect(pip?.querySelector('svg')).not.toBeNull();
  });

  it('draws no crown without a piece giving the mate', () => {
    const markup = mateBadgeMarkup({ king: { column: 0, row: 7 }, by: null, label: 'Checkmate' });
    expect(markup.value).not.toContain('ln-ext-mate__crown');
    expect(markup.value).toContain('ln-ext-mate__pip');
  });
});
