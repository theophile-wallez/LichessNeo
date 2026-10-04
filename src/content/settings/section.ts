import { closestTo, createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import {
  currentSettings,
  onSettings,
  saveSetting,
  settingsRead,
  type Settings,
} from './settings.ts';

// The account page's section for the extension: a card per setting, each
// with a switch. A new setting is a field of the schema (settings.ts) and a
// row here.

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
  const id = `cdc-setting-${key}`;
  return html`<div class="cdc-setting" data-cdc-setting="${key}">
    <span class="cdc-setting__icon" aria-hidden="true"></span>
    <div class="cdc-setting__text">
      <h2 class="cdc-setting__title" id="${id}">${title}</h2>
      <p class="cdc-setting__body">${body}</p>
    </div>
    <button type="button" class="cdc-switch" role="switch" aria-checked="false" aria-labelledby="${id}">
      <span class="cdc-switch__knob"></span>
    </button>
  </div>`;
}

const rowOf = (key: string | undefined): Row | undefined => rows().find(row => row.key === key);

function showSettings(section: HTMLElement, settings: Settings): void {
  // The switches wait for the stored settings, rather than flip from the defaults to them.
  setData(section, 'cdcPending', settingsRead() ? null : '');
  for (const element of queryAll(section, '.cdc-setting', HTMLElement)) {
    const row = rowOf(element.dataset.cdcSetting);
    const on = row ? settings[row.key] : false;
    setData(element, 'cdcOn', on ? '' : null);
    const button = queryOne(element, '.cdc-switch', HTMLButtonElement);
    if (button?.getAttribute('aria-checked') !== String(on))
      button?.setAttribute('aria-checked', String(on));
  }
}

function onClick(event: MouseEvent): void {
  if (!closestTo(event.target, '.cdc-switch', HTMLButtonElement)) return;
  const row = rowOf(closestTo(event.target, '.cdc-setting', HTMLElement)?.dataset.cdcSetting);
  if (row) void saveSetting(row.key, !currentSettings()[row.key]);
}

/** The section, for the account page's content column, kept in step with the settings. */
export function buildSection(): HTMLElement {
  const section = createElement('div', { className: 'page-menu__content cdc-settings' });
  setHtml(
    section,
    html`<div class="box box-pad">
      <h1 class="box__top">${message('settingsTitle')}</h1>
      <p class="cdc-settings__intro">${message('settingsIntro')}</p>
      <div class="cdc-settings__list">${rows().map(rowMarkup)}</div>
    </div>`,
  );
  section.addEventListener('click', onClick);
  showSettings(section, currentSettings());
  onSettings(settings => showSettings(section, settings));
  return section;
}
