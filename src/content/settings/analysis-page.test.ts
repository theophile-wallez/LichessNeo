import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, queryAll, queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import { buildAnalysisPage } from './analysis-page.ts';

// chrome.storage.sync, as the settings read and write it.
const synced = new Map<string, unknown>();

beforeEach(() => {
  synced.clear();
  vi.stubGlobal('chrome', {
    i18n: { getMessage: (name: string) => name },
    runtime: { id: 'test' },
    storage: {
      sync: {
        get: (key: string) => Promise.resolve({ [key]: synced.get(key) }),
        set: (items: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(items)) synced.set(key, value);
          return Promise.resolve();
        },
      },
      onChanged: { addListener: () => {} },
    },
  });
});

async function buildPage(): Promise<HTMLElement> {
  const page = createElement('div');
  page.append(...buildAnalysisPage());
  await flush();
  return page;
}

const switchOf = (page: HTMLElement, key: string): HTMLButtonElement | null =>
  queryOne(page, `[data-ln-ext-setting='${key}'] .ln-ext-switch`, HTMLButtonElement);

describe('the settings’ Analysis page', () => {
  it('heads the review’s settings, then the analysis board’s', async () => {
    const page = await buildPage();
    const order = queryAll(page, '.ln-ext-settings__group, [data-ln-ext-setting]', HTMLElement).map(
      element => element.dataset.lnExtSetting ?? element.textContent,
    );
    expect(order).toEqual([
      'settingsGroupReview',
      'classStyle',
      'coachBoard',
      'settingsGroupAnalysisBoard',
      'analysisCoach',
    ]);
  });

  it('draws the review’s badges as icons until dots are picked', async () => {
    const page = await buildPage();
    const select = queryOne(page, '.ln-ext-setting__select', HTMLSelectElement);
    if (!select) throw new Error('no menu');
    expect([...select.options].map(option => option.value)).toEqual(['icons', 'dots']);
    expect(select.value).toBe('icons');
    select.value = 'dots';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(synced.get('ln-ext-settings')).toMatchObject({ classStyle: 'dots' });
  });

  it('turns the analysis board’s coach on and off', async () => {
    const page = await buildPage();
    expect(switchOf(page, 'analysisCoach')?.getAttribute('aria-checked')).toBe('true');
    switchOf(page, 'analysisCoach')?.click();
    expect(switchOf(page, 'analysisCoach')?.getAttribute('aria-checked')).toBe('false');
    expect(synced.get('ln-ext-settings')).toMatchObject({ analysisCoach: false });
  });

  it('has the coach’s drawings’ card in place of their switch', async () => {
    const page = await buildPage();
    expect(queryOne(page, '.ln-ext-drawings', HTMLElement)?.dataset.lnExtSetting).toBe(
      'coachBoard',
    );
    expect(switchOf(page, 'coachBoard')).toBeNull();
  });
});
