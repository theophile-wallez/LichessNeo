import { closestTo, createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import { packLibrary } from '#content/packs/index.ts';
import { importSection } from '#content/packs/import-section.ts';
import { buildAppearance } from './appearance.ts';
import { onRatingChange, ratingRowMarkup, showRatingRow } from './rating-row.ts';
import {
  currentSettings,
  onSettings,
  saveSetting,
  settingsRead,
  type Settings,
} from './settings.ts';

// The account page's section for the extension: the appearance, a card per
// setting, each with a switch or a menu, then the imported packs. A new setting is a field of the
// schema (settings.ts) and a row here.

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

function showSettings(section: HTMLElement, settings: Settings): void {
  // The switches wait for the stored settings, rather than flip from the defaults to them.
  setData(section, 'lrExtPending', settingsRead() ? null : '');
  showRatingRow(section, settings);
  for (const element of queryAll(section, '.lr-ext-setting', HTMLElement)) {
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

/** The section, for the account page's content column, kept in step with the settings. */
export function buildSection(): HTMLElement {
  const section = createElement('div', { className: 'page-menu__content lr-ext-settings' });
  setHtml(
    section,
    html`<div class="box box-pad">
      <h1 class="box__top">${message('settingsTitle')}</h1>
      <p class="lr-ext-settings__intro">${message('settingsIntro')}</p>
      <div class="lr-ext-settings__list">${rows().map(rowMarkup)}${ratingRowMarkup()}</div>
    </div>`,
  );
  const list = section.querySelector('.lr-ext-settings__list');
  list?.before(buildAppearance());
  section.querySelector('.box')?.append(importSection(packLibrary()));
  section.addEventListener('click', onClick);
  section.addEventListener('change', onRatingChange);
  showSettings(section, currentSettings());
  onSettings(settings => showSettings(section, settings));
  return section;
}
