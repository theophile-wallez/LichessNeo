import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { createSpeedCards } from './index.ts';
import type { CardPick } from './picks.ts';

// The cards the settings pick, and whether they're read yet.
const settings = vi.hoisted((): { quickPairing: CardPick[]; read: boolean } => ({
  quickPairing: [],
  read: true,
}));

vi.mock('#content/settings/settings.ts', () => ({
  currentSettings: () => settings,
  settingsRead: () => settings.read,
}));

const PICKS: CardPick[] = [
  { speed: 'blitz' },
  {
    custom: {
      variant: 'standard',
      rated: true,
      clocks: [
        { minutes: 3, increment: 0 },
        { minutes: 4, increment: 0 },
      ],
    },
  },
  { custom: { variant: 'atomic', rated: false, clocks: [{ minutes: 1, increment: 0 }] } },
];

// What the content script posted the page world.
let posted: unknown[];

beforeEach(() => {
  document.body.innerHTML = '<main class="lobby"><section class="ln-ext-hero"></section></main>';
  settings.quickPairing = PICKS;
  settings.read = true;
  posted = [];
  vi.spyOn(window, 'postMessage').mockImplementation((data: unknown) => {
    posted.push(data);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

const signIn = (): void => {
  const cards = [{ perf: 'atomic', games: 12, rating: 1620, provisional: false, history: [] }];
  localStorage.setItem(
    'ln-ext-speed-cards',
    JSON.stringify({ user: 'eresy', at: Date.now(), cards }),
  );
};

const buttonText = ({ dataset, textContent, classList }: HTMLElement): string =>
  `${dataset.lnExtPool ?? dataset.lnExtCard} ${textContent.trim()}${classList.contains('ln-ext-speed__pool--main') ? ' main' : ''}`;

// Each card's name, then each button's target and label.
const shown = (): string[][] =>
  queryAll(document, '.ln-ext-speed', HTMLElement).map(card =>
    [card.querySelector('.ln-ext-speed__name')?.textContent ?? ''].concat(
      queryAll(card, '.ln-ext-speed__pool', HTMLElement).map(buttonText),
    ),
  );

const button = (key: string): HTMLElement | null =>
  queryOne(document, `.ln-ext-speed__pool[data-ln-ext-card='${key}']`, HTMLElement);

const seekOf = (seek: unknown): unknown => ({ type: 'ln-ext:custom-seek', seek });

describe("the player's own cards", () => {
  it("come in the settings' order, a pool where one plays the game, a seek otherwise", () => {
    signIn();
    createSpeedCards('eresy', 'en')();
    expect(shown()).toEqual([
      ['Blitz', '3+0 3 min', '3+2 3 + 2', '5+0 5 min', '5+3 5 + 3'],
      ['Blitz', '3+0 3 min main', 'standard/4+0/rated 4 min'],
      ['AtomicCasual', 'atomic/1+0/casual 1 min main'],
    ]);
    // Its rating, as a speed's card shows it.
    const atomic = document.querySelector("[data-ln-ext-speed='atomic']");
    expect(atomic?.querySelector('.ln-ext-speed__games')?.getAttribute('href')).toBe(
      '/@/eresy/perf/atomic',
    );
  });

  it('seek every game in the lobby signed out, which takes casual ones only', () => {
    createSpeedCards(undefined, 'en')();
    expect(shown()[1]).toEqual([
      'BlitzCasual',
      'standard/3+0/rated 3 min main',
      'standard/4+0/rated 4 min',
    ]);
    button('standard/4+0/rated')?.click();
    expect(posted).toEqual([
      seekOf({ variant: 'standard', minutes: 4, increment: 0, rated: false }),
    ]);
  });

  it('wait for the settings rather than show the default cards first', () => {
    settings.read = false;
    const sync = createSpeedCards(undefined, 'en');
    sync();
    expect(shown()).toEqual([]);
    settings.read = true;
    sync();
    expect(shown()).toHaveLength(3);
  });
});

describe("a card's own game", () => {
  it('is sought by the page world, the heading saying so, and stopped from there', () => {
    signIn();
    const sync = createSpeedCards('eresy', 'en');
    sync();
    button('atomic/1+0/casual')?.click();
    sync();
    const seek = { variant: 'atomic', minutes: 1, increment: 0, rated: false };
    expect(posted).toEqual([seekOf(seek)]);
    expect(button('atomic/1+0/casual')?.classList.contains('ln-ext-speed__pool--seeking')).toBe(
      true,
    );
    expect(document.querySelector('.ln-ext-speeds__seeking-text')?.textContent).toBe(
      'Looking for an opponent (Atomic 1 min)…',
    );
    queryOne(document, '.ln-ext-speeds__cancel', HTMLElement)?.click();
    sync();
    expect(posted).toEqual([seekOf(seek), seekOf(null)]);
    expect(document.querySelector('.ln-ext-speed__pool--seeking')).toBeNull();
  });

  it("stops when the page world gives up, or a pool's button is picked", () => {
    const sync = createSpeedCards(undefined, 'en');
    sync();
    button('atomic/1+0/casual')?.click();
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'ln-ext:custom-seek-state', seeking: false },
        source: window,
      }),
    );
    sync();
    expect(document.querySelector('.ln-ext-speeds--seeking')).toBeNull();
    button('atomic/1+0/casual')?.click();
    queryOne(document, "[data-ln-ext-pool='3+2']", HTMLElement)?.click();
    expect(posted.at(-1)).toEqual(seekOf(null));
  });
});

describe('the link to their settings', () => {
  it("leads to the settings' Quick pairing page, for a player signed in only", () => {
    signIn();
    createSpeedCards('eresy', 'fr')();
    const edit = queryOne(document, '.ln-ext-speeds__tools > .ln-ext-speeds__edit', HTMLElement);
    expect(edit?.getAttribute('href')).toBe('/account/profile#ln-ext-extension/pairing');
    expect(edit?.textContent).toBe('Modifier');
    expect(edit?.nextElementSibling?.className).toBe('ln-ext-speeds__custom');
    document.body.innerHTML = '<main class="lobby"></main>';
    createSpeedCards(undefined, 'fr')();
    expect(document.querySelector('.ln-ext-speeds__custom')).not.toBeNull();
    expect(document.querySelector('.ln-ext-speeds__edit')).toBeNull();
  });
});
