import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import { PALETTES } from '#content/board-wave/wave/color.ts';
import { buildAnimationsCard } from './animations-card.ts';

const playWave = vi.hoisted(() =>
  vi.fn<(findBoard: () => HTMLElement | null, plan: unknown) => Promise<void>>(() =>
    Promise.resolve(),
  ),
);

vi.mock('#content/board-wave/load.ts', () => ({ loadWave: () => Promise.resolve(playWave) }));

// chrome.storage.sync, as the settings read and write it.
const synced = new Map<string, unknown>();

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
  playWave.mockClear();
  synced.clear();
  document.body.innerHTML = '';
  delete document.body.dataset.user;
});

const row = (page: HTMLElement, key: string): HTMLElement | null =>
  queryOne(page, `[data-ln-ext-setting='${key}']`, HTMLElement);
const storedSettings = (): unknown => synced.get('ln-ext-settings');
const OPTIONS = ".ln-ext-intro-option input[name='ln-ext-gameIntro']";
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
  const page = buildAnimationsCard();
  document.body.append(page);
  await flush();
  vi.useFakeTimers();
  return page;
}

describe('the settings’ game intro', () => {
  it('offers no animation first and by default, and plays the one picked', async () => {
    document.body.dataset.user = 'eresy';
    document.body.innerHTML = '<a id="user_tag">Eresy</a>';
    const page = buildAnimationsCard();
    document.body.append(page);
    await flush();
    expect(optionsOf(page).map(input => input.value)).toEqual([
      'off',
      'ripple',
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
    const page = buildAnimationsCard();
    document.body.append(page);
    await flush();
    pick(page, 'off');
    expect(storedSettings()).toMatchObject({ gameIntro: 'off' });
    expect(queryOne(page, PLAY, HTMLButtonElement)?.disabled).toBe(true);
    // The card dims only with nothing at the end either.
    expect(row(page, 'gameIntro')?.dataset.lnExtOn).toBe('');
    queryOne(page, "input[name='ln-ext-endAnimation'][value='none']", HTMLInputElement)?.click();
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
    const ringed = queryAll(
      page,
      ".ln-ext-intro-option.active input[name='ln-ext-gameIntro']",
      HTMLInputElement,
    );
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

const endInput = (page: HTMLElement, name: string, value: string): HTMLInputElement | null =>
  queryOne(page, `input[name='ln-ext-${name}'][value='${value}']`, HTMLInputElement);
const endOption = (page: HTMLElement, name: string, value: string): HTMLElement | null =>
  endInput(page, name, value)?.closest('label') ?? null;
const panel = (page: HTMLElement, name: string): HTMLElement | null =>
  queryOne(page, `[data-ln-ext-panel='${name}']`, HTMLElement);
const pieceOn = (page: HTMLElement, transform: string): HTMLElement | undefined =>
  queryAll(page, '.ln-ext-intro-preview__board piece', HTMLElement).find(
    piece => piece.style.transform === transform,
  );

describe('the settings’ game end', () => {
  it('shows its choices under its tab, the colours with the ripple alone', async () => {
    const page = await introPage();
    expect(panel(page, 'end')?.hidden).toBe(true);
    queryOne(page, "[data-ln-ext-tab='end']", HTMLButtonElement)?.click();
    expect([panel(page, 'start')?.hidden, panel(page, 'end')?.hidden]).toEqual([true, false]);
    // The settings of the tests before are kept: each pick is made here.
    endInput(page, 'endAnimation', 'wave')?.click();
    endInput(page, 'endWinColor', 'rainbow')?.click();
    expect(queryOne(page, '.ln-ext-intro-picker__win', HTMLElement)?.hidden).toBe(false);
    expect(endInput(page, 'endWinColor', 'rainbow')?.checked).toBe(true);
    endInput(page, 'endAnimation', 'confetti')?.click();
    expect(queryOne(page, '.ln-ext-intro-picker__win', HTMLElement)?.hidden).toBe(true);
  });

  it('saves its picks, the results off with no animation', async () => {
    const page = await introPage();
    endInput(page, 'endAnimation', 'none')?.click();
    expect(endInput(page, 'endResults', 'all')?.disabled).toBe(true);
    expect(storedSettings()).toMatchObject({ endAnimation: 'none' });
    endInput(page, 'endAnimation', 'wave')?.click();
    endInput(page, 'endResults', 'all')?.click();
    endInput(page, 'endWinColor', 'ocean')?.click();
    expect(storedSettings()).toMatchObject({
      endAnimation: 'wave',
      endResults: 'all',
      endWinColor: 'ocean',
    });
  });

  it('plays the last move of the result hovered, then its wave out of the mated king', async () => {
    const page = await introPage();
    queryOne(page, "[data-ln-ext-tab='end']", HTMLButtonElement)?.click();
    endInput(page, 'endAnimation', 'wave')?.click();
    vi.runAllTimers();
    // Every game: the Game of the Century, ...Rc2# on the user's king.
    point(endOption(page, 'endResults', 'all'), 'pointerover');
    const rook = pieceOn(page, 'translate(0%, 600%)');
    expect(rook?.className).toBe('black rook');
    vi.runAllTimers();
    expect(rook?.style.transform).toBe('translate(200%, 600%)');
    expect(queryAll(page, 'cg-board square.last-move', HTMLElement)).toHaveLength(2);
    expect(queryOne(page, 'cg-board square.check', HTMLElement)?.style.transform).toBe(
      'translate(200%, 700%)',
    );
    await vi.runAllTimersAsync();
    expect(playWave.mock.calls.at(-1)?.[1]).toMatchObject({
      source: { x: 2 / 8, y: 7 / 8 },
    });
    // A swatch plays a win in its colours; an intro brings the start position back.
    point(queryOne(page, "[data-ln-ext-win-color='sunset']", HTMLElement), 'pointerover');
    await vi.runAllTimersAsync();
    expect(playWave.mock.calls.at(-1)?.[1]).toMatchObject({ palette: PALETTES.sunset });
    point(optionOf(page, 'ticket'), 'pointerover');
    expect(queryAll(page, '.ln-ext-intro-preview__board piece', HTMLElement)).toHaveLength(32);
  });
});
