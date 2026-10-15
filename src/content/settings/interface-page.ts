import { closestTo, createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import { onRatingChange, ratingRowMarkup, showRatingRow } from './rating-row.ts';
import { currentSettings, onSettings, saveSetting, type Settings } from './settings.ts';

// The settings' Interface page: a card per setting, each with a switch or a
// menu. A new setting is a field of the schema (settings.ts) and a row here.

type Toggle = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

interface Row {
  readonly key: Toggle;
  readonly title: string;
  readonly body: string;
}

const rows = (): readonly Row[] => [
  { key: 'uiSounds', title: message('settingUiSounds'), body: message('settingUiSoundsBody') },
];

function rowMarkup({ key, title, body }: Row): SafeHtml {
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

const rowOf = (key: string | undefined): Row | undefined => rows().find(row => row.key === key);

function showRows(list: HTMLElement, settings: Settings): void {
  showRatingRow(list, settings);
  for (const element of queryAll(list, '.lr-ext-setting', HTMLElement)) {
    const row = rowOf(element.dataset.lrExtSetting);
    // A menu's card, always on.
    if (!row) continue;
    const on = settings[row.key];
    setData(element, 'lrExtOn', on ? '' : null);
    const button = queryOne(element, '.lr-ext-switch', HTMLButtonElement);
    if (button?.getAttribute('aria-checked') !== String(on))
      button?.setAttribute('aria-checked', String(on));
  }
}

function onClick(event: MouseEvent): void {
  if (!closestTo(event.target, '.lr-ext-switch', HTMLButtonElement)) return;
  const row = rowOf(closestTo(event.target, '.lr-ext-setting', HTMLElement)?.dataset.lrExtSetting);
  if (row) void saveSetting(row.key, !currentSettings()[row.key]);
}

/** The page's cards, kept in step with the settings. */
export function buildInterfacePage(): HTMLElement {
  const list = createElement('div', { className: 'lr-ext-settings__list' });
  setHtml(list, html`${rows().map(rowMarkup)}${ratingRowMarkup()}`);
  list.addEventListener('click', onClick);
  list.addEventListener('change', onRatingChange);
  showRows(list, currentSettings());
  onSettings(settings => showRows(list, settings));
  return list;
}
