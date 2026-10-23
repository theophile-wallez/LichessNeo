import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import { buildInterfacePage } from './interface-page.ts';

// chrome.storage.sync, as the settings read and write it, starting with the sounds off.
const synced = new Map<string, unknown>([['ln-ext-settings', { uiSounds: false }]]);

beforeEach(() => {
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

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
  delete document.body.dataset.user;
});

const row = (page: HTMLElement, key: string): HTMLElement | null =>
  queryOne(page, `[data-ln-ext-setting='${key}']`, HTMLElement);
const switchOf = (page: HTMLElement): HTMLButtonElement | null =>
  queryOne(page, "[data-ln-ext-setting='uiSounds'] .ln-ext-switch", HTMLButtonElement);
const storedSettings = (): unknown => synced.get('ln-ext-settings');
const OPTIONS = '.ln-ext-intro-option input';
const optionsOf = (page: HTMLElement): HTMLInputElement[] =>
  queryAll(page, OPTIONS, HTMLInputElement);
const pick = (page: HTMLElement, kind: string): void => {
  optionsOf(page)
    .find(input => input.value === kind)
    ?.click();
};
const PLAY = '.ln-ext-intro-preview__play';
const optionOf = (page: HTMLElement, kind: string): HTMLElement | null =>
  queryOne(page, `.ln-ext-intro-option:has(input[value='${kind}'])`, HTMLElement);
const sceneOf = (page: HTMLElement): HTMLElement | null =>
  queryOne(page, '.ln-ext-intro-preview__scene', HTMLElement);

function point(target: Element | null, type: string, pointerType = 'mouse'): void {
  target?.dispatchEvent(new PointerEvent(type, { bubbles: type === 'pointerover', pointerType }));
}

async function introPage(): Promise<HTMLElement> {
  const page = buildInterfacePage();
  document.body.append(page);
  await flush();
  vi.useFakeTimers();
  return page;
}

describe('the settings’ Interface page', () => {
  it('shows the stored settings once read, and flips a switch', async () => {
    const page = buildInterfacePage();
    await flush();
    expect(switchOf(page)?.getAttribute('aria-checked')).toBe('false');
    expect(row(page, 'uiSounds')?.dataset.lnExtOn).toBeUndefined();
    switchOf(page)?.click();
    expect(storedSettings()).toMatchObject({ uiSounds: true });
    expect(switchOf(page)?.getAttribute('aria-checked')).toBe('true');
    expect(row(page, 'uiSounds')?.dataset.lnExtOn).toBe('');
  });

  it('keeps the rating the sidebar shows, from its menu', async () => {
    const page = buildInterfacePage();
    await flush();
    const select = queryOne(
      page,
      "[data-ln-ext-setting='sidebarRating'] .ln-ext-setting__select",
      HTMLSelectElement,
    );
    if (!select) throw new Error('no menu');
    expect([...select.options].map(option => option.value)).toEqual([
      'hidden',
      'mostPlayed',
      'ultraBullet',
      'bullet',
      'blitz',
      'rapid',
      'classical',
      'correspondence',
    ]);
    select.value = 'blitz';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(storedSettings()).toMatchObject({ sidebarRating: 'blitz' });
    select.value = 'hidden';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(storedSettings()).toMatchObject({ sidebarRating: 'hidden' });
  });

  it('puts the nav where it’s picked, a sidebar by default', async () => {
    const page = buildInterfacePage();
    await flush();
    const picks = queryAll(page, '.ln-ext-nav-pick', HTMLButtonElement);
    const checked = (): (string | undefined)[] =>
      picks
        .filter(pick => pick.getAttribute('aria-checked') === 'true')
        .map(pick => pick.dataset.lnExtNavigation);
    expect(picks.map(pick => pick.dataset.lnExtNavigation)).toEqual([
      'sidebar',
      'unfolded',
      'rail',
      'header',
    ]);
    expect(checked()).toEqual(['sidebar']);
    picks[3]
      ?.querySelector('.ln-ext-nav-pick__name')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(storedSettings()).toMatchObject({ navigation: 'header' });
    expect(checked()).toEqual(['header']);
  });

  it('draws each rating’s option with its icon, a speed’s glyph in its color', async () => {
    const page = buildInterfacePage();
    await flush();
    const icon = (value: string): HTMLElement | null =>
      queryOne(page, `option[value='${value}'] .ln-ext-setting__option-icon`, HTMLElement);
    expect(icon('hidden')?.dataset.lnExtPick).toBe('hidden');
    expect(icon('hidden')?.querySelector('svg')).not.toBeNull();
    expect(icon('mostPlayed')?.querySelector('svg')).not.toBeNull();
    expect(icon('rapid')?.dataset.lnExtSpeed).toBe('rapid');
    expect(icon('rapid')?.style.getPropertyValue('--ln-ext-speed-color')).not.toBe('');
    expect(queryOne(page, "option[value='rapid'] span:last-child", HTMLElement)?.textContent).toBe(
      'speedRapid',
    );
  });

  it('leaves the settings alone on a click beside the switch', async () => {
    const page = buildInterfacePage();
    await flush();
    const before = storedSettings();
    queryOne(page, "[data-ln-ext-setting='uiSounds'] .ln-ext-setting__title", HTMLElement)?.click();
    expect(storedSettings()).toBe(before);
  });

  it('offers no animation first and by default, and plays the one picked', async () => {
    document.body.dataset.user = 'eresy';
    document.body.innerHTML = '<a id="user_tag">Eresy</a>';
    const page = buildInterfacePage();
    document.body.append(page);
    await flush();
    expect(optionsOf(page).map(input => input.value)).toEqual([
      'off',
      'salute',
      'setup',
      'march',
      'weave',
      'wave',
      'ticket',
      'camps',
      'credits',
      'faceoff',
    ]);
    expect(optionsOf(page).find(input => input.checked)?.value).toBe('off');
    expect(page.querySelector('.ln-ext-intro-preview__bar--bottom b')?.textContent).toBe('Eresy');
    vi.useFakeTimers();
    pick(page, 'ticket');
    expect(storedSettings()).toMatchObject({ gameIntro: 'ticket' });
    const scene = queryOne(page, '.ln-ext-intro-preview__scene', HTMLElement);
    expect(scene?.dataset.lnExtIntro).toBe('ticket');
    expect(scene?.querySelector(':scope > .ln-ext-intro-fx--inline')).not.toBeNull();
    // The button plays it again from its start.
    queryOne(page, PLAY, HTMLButtonElement)?.click();
    expect(scene?.querySelectorAll('.ln-ext-intro-fx')).toHaveLength(1);
    vi.runAllTimers();
    expect(scene?.dataset.lnExtIntro).toBeUndefined();
    expect(scene?.querySelector('.ln-ext-intro-fx')).toBeNull();
  });

  it('greys the intro’s card and its button out with no animation picked', async () => {
    const page = buildInterfacePage();
    document.body.append(page);
    await flush();
    pick(page, 'off');
    expect(storedSettings()).toMatchObject({ gameIntro: 'off' });
    expect(row(page, 'gameIntro')?.dataset.lnExtOn).toBeUndefined();
    expect(queryOne(page, PLAY, HTMLButtonElement)?.disabled).toBe(true);
    expect(page.querySelector('.ln-ext-intro-fx')).toBeNull();
  });

  it('plays an intro as the pointer comes over it, unsaved, and goes on across the list', async () => {
    const page = await introPage();
    const before = storedSettings();
    point(optionOf(page, 'ticket')?.querySelector('span') ?? null, 'pointerover');
    expect(sceneOf(page)?.dataset.lnExtIntro).toBe('ticket');
    const playing = sceneOf(page)?.querySelector('.ln-ext-intro-fx');
    expect(playing).not.toBeNull();
    // Over the same option again, it isn't started over.
    point(optionOf(page, 'ticket'), 'pointerover');
    expect(sceneOf(page)?.querySelector('.ln-ext-intro-fx')).toBe(playing);
    point(optionOf(page, 'credits'), 'pointerover');
    expect(sceneOf(page)?.dataset.lnExtIntro).toBe('credits');
    expect(storedSettings()).toBe(before);
  });

  it('keeps the hovered intro playing when it is clicked, and rings it alone', async () => {
    const page = await introPage();
    point(optionOf(page, 'weave'), 'pointerover');
    const playing = sceneOf(page)?.querySelector('.ln-ext-intro-fx');
    expect(playing).not.toBeNull();
    pick(page, 'weave');
    expect(storedSettings()).toMatchObject({ gameIntro: 'weave' });
    expect(sceneOf(page)?.querySelector('.ln-ext-intro-fx')).toBe(playing);
    const ringed = queryAll(page, '.ln-ext-intro-option.active input', HTMLInputElement);
    expect(ringed.map(input => input.value)).toEqual(['weave']);
  });

  it('plays nothing on a touch until it picks, nor once the pointer left', async () => {
    const page = await introPage();
    point(optionOf(page, 'credits'), 'pointerover', 'touch');
    expect(sceneOf(page)?.dataset.lnExtIntro).toBeUndefined();
    point(optionOf(page, 'credits'), 'pointerover');
    point(queryOne(page, '.ln-ext-intro-picker', HTMLElement), 'pointerleave');
    vi.runAllTimers();
    // Hovered no more, a click on it plays it again.
    pick(page, 'credits');
    expect(sceneOf(page)?.dataset.lnExtIntro).toBe('credits');
  });
});
