import { closestTo, createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import { currentSettings, onSettings, saveSetting, type Settings } from './settings.ts';

// A list of the settings' cards, one per setting with a switch. A new switch is
// a boolean field of the schema (settings.ts) and a row in a list.

type Toggle = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

export interface SwitchRow {
  readonly key: Toggle;
  readonly title: string;
  readonly body: string;
}

function rowMarkup({ key, title, body }: SwitchRow): SafeHtml {
  const id = `ln-ext-setting-${key}`;
  return html`<div class="ln-ext-setting" data-ln-ext-setting="${key}">
    <span class="ln-ext-setting__icon" aria-hidden="true"></span>
    <div class="ln-ext-setting__text">
      <h2 class="ln-ext-setting__title" id="${id}">${title}</h2>
      <p class="ln-ext-setting__body">${body}</p>
    </div>
    <button type="button" class="ln-ext-switch" role="switch" aria-checked="false" aria-labelledby="${id}">
      <span class="ln-ext-switch__knob"></span>
    </button>
  </div>`;
}

function showSwitches(list: HTMLElement, rows: readonly SwitchRow[], settings: Settings): void {
  for (const element of queryAll(list, '.ln-ext-setting', HTMLElement)) {
    const row = rows.find(({ key }) => key === element.dataset.lnExtSetting);
    // Another kind of card, always on.
    if (!row) continue;
    const on = settings[row.key];
    setData(element, 'lnExtOn', on ? '' : null);
    const button = queryOne(element, '.ln-ext-switch', HTMLButtonElement);
    if (button?.getAttribute('aria-checked') !== String(on))
      button?.setAttribute('aria-checked', String(on));
  }
}

/** A list of the cards of `markup`, which their own module keeps in step. */
export function buildCardList(markup: SafeHtml): HTMLElement {
  const list = createElement('div', { className: 'ln-ext-settings__list' });
  setHtml(list, markup);
  return list;
}

/** The cards of `rows`, then `others`, their switches kept in step with the settings. */
export function buildSwitchList(rows: readonly SwitchRow[], others?: SafeHtml): HTMLElement {
  const list = buildCardList(html`${rows.map(rowMarkup)}${others ?? ''}`);
  list.addEventListener('click', event => {
    if (!closestTo(event.target, '.ln-ext-switch', HTMLButtonElement)) return;
    const card = closestTo(event.target, '.ln-ext-setting', HTMLElement);
    const row = rows.find(({ key }) => key === card?.dataset.lnExtSetting);
    if (row) void saveSetting(row.key, !currentSettings()[row.key]);
  });
  showSwitches(list, rows, currentSettings());
  onSettings(settings => showSwitches(list, rows, settings));
  return list;
}
