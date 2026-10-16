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
  const id = `lr-ext-setting-${key}`;
  return html`<div class="lr-ext-setting" data-lr-ext-setting="${key}">
    <span class="lr-ext-setting__icon" aria-hidden="true"></span>
    <div class="lr-ext-setting__text">
      <h2 class="lr-ext-setting__title" id="${id}">${title}</h2>
      <p class="lr-ext-setting__body">${body}</p>
    </div>
    <button type="button" class="lr-ext-switch" role="switch" aria-checked="false" aria-labelledby="${id}">
      <span class="lr-ext-switch__knob"></span>
    </button>
  </div>`;
}

function showSwitches(list: HTMLElement, rows: readonly SwitchRow[], settings: Settings): void {
  for (const element of queryAll(list, '.lr-ext-setting', HTMLElement)) {
    const row = rows.find(({ key }) => key === element.dataset.lrExtSetting);
    // Another kind of card, always on.
    if (!row) continue;
    const on = settings[row.key];
    setData(element, 'lrExtOn', on ? '' : null);
    const button = queryOne(element, '.lr-ext-switch', HTMLButtonElement);
    if (button?.getAttribute('aria-checked') !== String(on))
      button?.setAttribute('aria-checked', String(on));
  }
}

/** The cards of `rows`, then `others`, their switches kept in step with the settings. */
export function buildSwitchList(rows: readonly SwitchRow[], others?: SafeHtml): HTMLElement {
  const list = createElement('div', { className: 'lr-ext-settings__list' });
  setHtml(list, html`${rows.map(rowMarkup)}${others ?? ''}`);
  list.addEventListener('click', event => {
    if (!closestTo(event.target, '.lr-ext-switch', HTMLButtonElement)) return;
    const card = closestTo(event.target, '.lr-ext-setting', HTMLElement);
    const row = rows.find(({ key }) => key === card?.dataset.lrExtSetting);
    if (row) void saveSetting(row.key, !currentSettings()[row.key]);
  });
  showSwitches(list, rows, currentSettings());
  onSettings(settings => showSwitches(list, rows, settings));
  return list;
}
