import { closestTo, queryOne } from '#shared/dom.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { currentSettings, onSettings, saveSetting, type Settings } from './settings.ts';
import { buildCardList } from './switch-list.ts';

// A settings' card like the switches' (switch-list.ts), with a menu in place of
// the switch (styles/pages/setting-menu.css). Chrome's customizable select
// draws each option's icon, and the picked one's in its button
// (`selectedcontent`); other browsers show the names alone.

type Choice = { [K in keyof Settings]: Settings[K] extends string ? K : never }[keyof Settings];

export interface SelectOption<K extends Choice> {
  readonly value: Settings[K] & string;
  readonly label: string;
  readonly icon: SafeHtml;
}

export interface SelectRowSpec<K extends Choice> {
  readonly key: K;
  readonly title: string;
  readonly body: string;
  readonly options: readonly SelectOption<K>[];
}

function selectRowMarkup<K extends Choice>({
  key,
  title,
  body,
  options,
}: SelectRowSpec<K>): SafeHtml {
  const id = `ln-ext-setting-${key}`;
  const items = options.map(
    ({ value, label, icon }) =>
      html`<option value="${value}">${icon}<span>${label}</span></option>`,
  );
  return html`<div class="ln-ext-setting" data-ln-ext-setting="${key}" data-ln-ext-on="">
    <span class="ln-ext-setting__icon" aria-hidden="true"></span>
    <div class="ln-ext-setting__text">
      <h2 class="ln-ext-setting__title" id="${id}">${title}</h2>
      <p class="ln-ext-setting__body">${body}</p>
    </div>
    <select class="ln-ext-setting__select" aria-labelledby="${id}">
      <button type="button"><selectedcontent></selectedcontent></button>
      ${items}
    </select>
  </div>`;
}

/** The card of `spec`, its menu kept in step with the settings. */
export function buildSelectRow<K extends Choice>(spec: SelectRowSpec<K>): HTMLElement {
  const list = buildCardList(selectRowMarkup(spec));
  const select = queryOne(list, '.ln-ext-setting__select', HTMLSelectElement);
  const show = (settings: Settings): void => {
    const picked = spec.options.find(({ value }) => value === settings[spec.key]);
    if (select && picked && select.value !== picked.value) select.value = picked.value;
  };
  list.addEventListener('change', event => {
    const target = closestTo(event.target, '.ln-ext-setting__select', HTMLSelectElement);
    const picked = spec.options.find(({ value }) => value === target?.value);
    if (picked) void saveSetting(spec.key, picked.value);
  });
  show(currentSettings());
  onSettings(show);
  return list;
}
