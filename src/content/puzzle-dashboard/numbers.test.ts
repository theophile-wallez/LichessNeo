import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { overview } from './data.ts';
import { DASHBOARD, THEMES } from './fixtures/dashboard.ts';
import { numbersMarkup } from './numbers.ts';

// Each message as its name, then what fills it in.
const getMessage = (name: string, substitutions: readonly string[] = []): string =>
  [name, ...substitutions].join(':');

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

function card(
  data = DASHBOARD,
  replayHref: string | null = '/training/replay/30/mix',
): HTMLElement {
  setHtml(document.body, numbersMarkup(overview(data), replayHref));
  const numbers = queryOne(document, '.lr-ext-pdash__numbers', HTMLElement);
  if (!numbers) throw new Error('no numbers card');
  return numbers;
}

const text = (root: ParentNode, selector: string): string =>
  queryOne(root, selector, HTMLElement)?.textContent.replace(/\s+/g, ' ').trim() ?? '';

describe('the numbers card', () => {
  it('rings the first-try share, beside its count', () => {
    const numbers = card();
    const ring = queryOne(numbers, '.lr-ext-pdash__ring--big', HTMLElement);
    expect(ring?.style.getPropertyValue('--lr-ext-pdash-p')).toBe('0.439');
    expect(text(numbers, '.lr-ext-pdash__lead strong')).toBe('pdashSolvedOf:18:41');
  });

  it('gives the performance and the best theme against their level, the theme a link', () => {
    const numbers = card();
    const [performance, best] = numbers.querySelectorAll('.lr-ext-pdash__cell');
    expect(performance?.querySelector('strong')?.textContent).toBe('2,038');
    expect(performance?.querySelector('.lr-ext-pdash__pill')?.textContent).toBe('−61');
    expect(best?.getAttribute('href')).toBe('/training/exposedKing');
    expect(best?.querySelector('.lr-ext-pdash__pill')?.textContent).toBe('+500');
  });

  it('leaves the best theme out when none beats its level', () => {
    const { sacrifice } = THEMES;
    expect(
      card({ ...DASHBOARD, themes: { sacrifice } }).querySelectorAll('.lr-ext-pdash__cell'),
    ).toHaveLength(1);
  });

  it('ends on the puzzles to replay, a link to Lichess’s replay, or says there are none', () => {
    const foot = queryOne(card(), 'a.lr-ext-pdash__foot', HTMLAnchorElement);
    expect(foot?.getAttribute('href')).toBe('/training/replay/30/mix');
    expect(text(foot ?? document, 'span')).toBe('23 pdashFailed');
    const clear = card({ ...DASHBOARD, global: { ...DASHBOARD.global, firstWins: 41 } }, null);
    expect(text(clear, 'div.lr-ext-pdash__foot')).toBe('pdashAllClear');
  });
});
