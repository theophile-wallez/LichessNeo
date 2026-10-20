import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { pickSelectedOptions } from '#shared/testing/selects.ts';
import { flush } from '#shared/testing/timers.ts';
import { DEFAULT_PICKS, MAX_PICKS, type CardPick } from '#content/pages/speed-cards/picks.ts';
import { buildPairingPage, type PairingPage } from './pairing-page.ts';
import { currentSettings, saveSetting } from './settings.ts';

// chrome.storage.sync, as the settings read and write it.
const synced = new Map<string, unknown>();

// Six recent games of Atomic 3+2, rated.
const ATOMIC_GAMES = Array.from({ length: 6 }, () =>
  JSON.stringify({ variant: 'atomic', rated: true, clock: { initial: 180, increment: 2 } }),
).join('\n');

beforeEach(async () => {
  vi.stubGlobal('chrome', {
    i18n: {
      getMessage: (name: string, substitutions: string[] = []) =>
        [name, ...substitutions].join(':'),
    },
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
  vi.stubGlobal('fetch', () => Promise.resolve(new Response(ATOMIC_GAMES)));
  document.body.dataset.user = 'eresy';
  await saveSetting('quickPairing', DEFAULT_PICKS);
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
  delete document.body.dataset.user;
});

async function open(): Promise<PairingPage> {
  const page = buildPairingPage();
  document.body.append(page.element);
  page.show(true);
  await flush();
  settle(page);
  return page;
}

// The menus the form just drew, read as a browser would, then the form drawn again.
function settle({ element }: PairingPage): void {
  pickSelectedOptions(element);
  element.dispatchEvent(new Event('change'));
}

const card = (name: string): string => `[data-ln-ext-pairing='${name}']`;

const keys = ({ element }: PairingPage, name = 'cards'): string[] =>
  queryAll(element, `${card(name)} .ln-ext-pairing__row`, HTMLElement).map(
    row => row.dataset.lnExtKey ?? '',
  );

const button = ({ element }: PairingPage, selector: string): HTMLButtonElement => {
  const found = queryOne(element, selector, HTMLButtonElement);
  if (!found) throw new Error(`no ${selector}`);
  return found;
};

const rowButton = (page: PairingPage, key: string, action: string): HTMLButtonElement =>
  button(page, `${card('cards')} [data-ln-ext-key='${key}'] [data-ln-ext-action='${action}']`);

const text = ({ element }: PairingPage, selector: string): string =>
  queryOne(element, selector, HTMLElement)?.textContent?.trim() ?? '';

const menu = ({ element }: PairingPage, name: string, index = 0): HTMLSelectElement => {
  const found = queryAll(element, `select[name='${name}']`, HTMLSelectElement)[index];
  if (!found) throw new Error(`no ${name} menu`);
  return found;
};

function choose(page: PairingPage, name: string, value: string, index = 0): void {
  const select = menu(page, name, index);
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

const PREVIEW = '.ln-ext-pairing__preview';
const ATOMIC = 'atomic/3+2/rated';
const BULLET_1_1 = 'standard/1+0/rated,standard/2+1/rated,standard/1+1/rated';

describe('the settings’ Quick pairing page', () => {
  it('lists the home’s cards, the defaults’ way back off while they are on', async () => {
    const page = await open();
    expect(keys(page)).toEqual(['bullet', 'blitz', 'rapid', 'classical']);
    expect(button(page, "[data-ln-ext-action='reset']").disabled).toBe(true);
    expect(rowButton(page, 'bullet', 'up').disabled).toBe(true);
    expect(rowButton(page, 'classical', 'down').disabled).toBe(true);
  });

  it('moves a card, takes one off, and puts the defaults back', async () => {
    const page = await open();
    rowButton(page, 'bullet', 'down').click();
    rowButton(page, 'classical', 'up').click();
    expect(keys(page)).toEqual(['blitz', 'bullet', 'classical', 'rapid']);
    rowButton(page, 'rapid', 'remove').click();
    expect(currentSettings().quickPairing).toEqual([
      { speed: 'blitz' },
      { speed: 'bullet' },
      { speed: 'classical' },
    ]);
    button(page, "[data-ln-ext-action='reset']").click();
    expect(keys(page)).toEqual(['bullet', 'blitz', 'rapid', 'classical']);
  });

  it('keeps one card at least', async () => {
    await saveSetting('quickPairing', [{ speed: 'rapid' }]);
    const page = await open();
    expect(rowButton(page, 'rapid', 'remove').disabled).toBe(true);
  });

  it('shows shapes while the games are read, then suggests what they play', async () => {
    const page = buildPairingPage();
    page.show(true);
    expect(queryAll(page.element, '.ln-ext-pairing__row--skeleton', HTMLElement)).toHaveLength(3);
    await flush();
    expect(keys(page, 'suggestions')).toEqual([ATOMIC]);
    expect(text(page, `${card('suggestions')} .ln-ext-pairing__games`)).toBe('pairingGames:6');
    button(page, `${card('suggestions')} [data-ln-ext-action='add']`).click();
    expect(keys(page).at(-1)).toBe(ATOMIC);
    // Played by the cards now.
    expect(keys(page, 'suggestions')).toEqual([]);
    expect(text(page, `${card('suggestions')} .ln-ext-pairing__note`)).toBe(
      'pairingSuggestionsNone',
    );
  });

  it('adds nothing more to a full home', async () => {
    const full: CardPick[] = Array.from({ length: MAX_PICKS }, (_, index) => ({
      custom: { variant: 'horde', rated: true, clocks: [{ minutes: index + 1, increment: 0 }] },
    }));
    await saveSetting('quickPairing', full);
    const page = await open();
    expect(button(page, `${card('suggestions')} [data-ln-ext-action='add']`).disabled).toBe(true);
    expect(button(page, `${PREVIEW} [data-ln-ext-action='add']`).disabled).toBe(true);
    expect(text(page, '.ln-ext-pairing__made .ln-ext-pairing__note')).toBe(
      `pairingFull:${MAX_PICKS}`,
    );
  });

  it('makes a card of the player’s own, unless the cards play it already', async () => {
    const page = await open();
    expect(keys(page, 'create')).toEqual(['standard/3+1/rated']);
    choose(page, 'increment', '2');
    expect(button(page, `${PREVIEW} [data-ln-ext-action='add']`).disabled).toBe(true);
    expect(text(page, '.ln-ext-pairing__made .ln-ext-pairing__note')).toBe('pairingThere');
    choose(page, 'variant', 'chess960');
    button(page, `${PREVIEW} [data-ln-ext-action='add']`).click();
    expect(currentSettings().quickPairing.at(-1)).toEqual({
      custom: { variant: 'chess960', rated: true, clocks: [{ minutes: 3, increment: 2 }] },
    });
  });
});

describe('changing a card on the Quick pairing page', () => {
  it('opens the card in the form, marked, and saves it in its place', async () => {
    const page = await open();
    rowButton(page, 'bullet', 'edit').click();
    settle(page);
    expect(text(page, `${card('create')} .ln-ext-setting__title`)).toBe('pairingEditTitle');
    expect(
      queryOne(page.element, "[data-ln-ext-key='bullet']", HTMLElement)?.classList.contains(
        'ln-ext-pairing__row--editing',
      ),
    ).toBe(true);
    // Bullet's own pools, as they are, are still the Bullet card.
    expect(keys(page, 'create')).toEqual(['bullet']);
    button(page, "[data-ln-ext-action='add-clock']").click();
    settle(page);
    choose(page, 'minutes', '1', 2);
    choose(page, 'increment', '1', 2);
    // A card's own games don't stop it.
    expect(text(page, '.ln-ext-pairing__made .ln-ext-pairing__note')).toBe('');
    button(page, `${PREVIEW} [data-ln-ext-action='save']`).click();
    settle(page);
    expect(keys(page)).toEqual([BULLET_1_1, 'blitz', 'rapid', 'classical']);
    expect(text(page, `${card('create')} .ln-ext-setting__title`)).toBe('pairingCreateTitle');
    expect(keys(page, 'create')).toEqual(['standard/3+1/rated']);
  });

  it('turns a card back into its speed’s when it plays that speed’s pools again', async () => {
    const custom = {
      variant: 'standard' as const,
      rated: true,
      clocks: [
        { minutes: 1, increment: 0 },
        { minutes: 2, increment: 1 },
        { minutes: 1, increment: 1 },
      ],
    };
    await saveSetting('quickPairing', [{ custom }, { speed: 'blitz' }]);
    const page = await open();
    rowButton(page, BULLET_1_1, 'edit').click();
    settle(page);
    button(page, ".ln-ext-pairing__clock:last-child [data-ln-ext-action='remove-clock']").click();
    button(page, `${PREVIEW} [data-ln-ext-action='save']`).click();
    expect(currentSettings().quickPairing).toEqual([{ speed: 'bullet' }, { speed: 'blitz' }]);
  });

  it('empties the form on cancel, or once the card changed is taken off', async () => {
    const page = await open();
    rowButton(page, 'rapid', 'edit').click();
    settle(page);
    button(page, `${PREVIEW} [data-ln-ext-action='cancel']`).click();
    settle(page);
    expect(keys(page, 'create')).toEqual(['standard/3+1/rated']);
    expect(currentSettings().quickPairing).toEqual(DEFAULT_PICKS);
    rowButton(page, 'rapid', 'edit').click();
    rowButton(page, 'rapid', 'remove').click();
    settle(page);
    expect(text(page, `${card('create')} .ln-ext-setting__title`)).toBe('pairingCreateTitle');
    expect(keys(page, 'create')).toEqual(['standard/3+1/rated']);
  });
});
