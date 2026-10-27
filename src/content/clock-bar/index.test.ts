import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';

// chrome.storage.sync, as the settings read and write it.
const synced = new Map<string, unknown>();

beforeEach(() => {
  vi.resetModules();
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
  synced.clear();
  document.body.replaceChildren();
  delete document.documentElement.dataset.lnExtClockBar;
});

// Lichess's preferences page, its clock bar's row as lila's AccountUi.radios renders it, the
// account's Yes checked: Lichess's default.
const PREFERENCES =
  '<form class="autosubmit"><group class="radio">' +
  '<div><input id="irclock.bar_0" type="radio" value="0" name="clock.bar">' +
  '<label for="irclock.bar_0">No</label></div>' +
  '<div><input id="irclock.bar_1" type="radio" value="1" name="clock.bar" checked>' +
  '<label for="irclock.bar_1">Yes</label></div></group></form>';

async function start(page = ''): Promise<void> {
  document.body.innerHTML = page;
  const { clockBar } = await import('./index.ts');
  clockBar.start();
  await flush();
}

/** The value of the radio checked. */
const checked = (): string | undefined =>
  queryAll(document, "input[name='clock.bar']", HTMLInputElement).find(radio => radio.checked)
    ?.value;

const barShown = (): boolean => document.documentElement.dataset.lnExtClockBar !== undefined;

describe('the clock bar', () => {
  it('stays hidden by default, whatever the account says', async () => {
    await start();
    expect(barShown()).toBe(false);
  });

  it('shows once picked', async () => {
    synced.set('ln-ext-settings', { clockBar: true });
    await start();
    expect(barShown()).toBe(true);
  });

  it('shows Neo’s No on Lichess’s preferences page, tagged as Neo’s', async () => {
    await start(PREFERENCES);
    expect(checked()).toBe('0');
    expect(
      queryOne(document, "label[for='irclock.bar_0'] .ln-ext-neo-default", HTMLElement),
    ).not.toBeNull();
    expect(
      queryOne(document, "label[for='irclock.bar_1'] .ln-ext-neo-default", HTMLElement),
    ).toBeNull();
  });

  it('follows the user’s pick there, kept for every page', async () => {
    await start(PREFERENCES);
    const yes = queryOne(document, "input[value='1']", HTMLInputElement);
    if (!yes) throw new Error('no Yes');
    yes.checked = true;
    yes.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    expect(synced.get('ln-ext-settings')).toMatchObject({ clockBar: true });
    expect(barShown()).toBe(true);
    expect(checked()).toBe('1');
  });
});
