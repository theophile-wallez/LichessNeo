import { closestTo, queryOne, setData } from '#shared/dom.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import { INTRO_KINDS, IntroKindSchema, type IntroKind } from '#content/game/intro/kinds.ts';
import { buildIntroPreview } from './intro-preview.ts';
import { currentSettings, onSettings, saveSetting, type Settings } from './settings.ts';

// The setting of the players' intro at a game's start: a card like the
// rating's (rating-row.ts), with a menu of the intros, "No animation" first,
// and a preview that plays the one picked (intro-preview.ts).

const KIND_NAMES: Readonly<Record<IntroKind, string>> = {
  off: 'introOff',
  salute: 'introSalute',
  setup: 'introSetup',
  march: 'introMarch',
  weave: 'introWeave',
  wave: 'introWave',
  ticket: 'introTicket',
  camps: 'introCamps',
  credits: 'introCredits',
  faceoff: 'introFaceOff',
};

const SELECT = "[data-ln-ext-setting='gameIntro'] .ln-ext-setting__select";
const PLAY = '.ln-ext-intro-preview__play';

export function introRowMarkup(): SafeHtml {
  const id = 'ln-ext-setting-gameIntro';
  const options = INTRO_KINDS.map(
    kind => html`<option value="${kind}">${message(KIND_NAMES[kind])}</option>`,
  );
  return html`<div class="ln-ext-setting" data-ln-ext-setting="gameIntro" data-ln-ext-on="">
    <span class="ln-ext-setting__icon" aria-hidden="true"></span>
    <div class="ln-ext-setting__text">
      <h2 class="ln-ext-setting__title" id="${id}">${message('settingGameIntro')}</h2>
      <p class="ln-ext-setting__body">${message('settingGameIntroBody')}</p>
    </div>
    <select class="ln-ext-setting__select" aria-labelledby="${id}">${options}</select>
  </div>`;
}

function showIntroRow(list: HTMLElement, settings: Settings): void {
  const select = queryOne(list, SELECT, HTMLSelectElement);
  if (select && select.value !== settings.gameIntro) select.value = settings.gameIntro;
  const off = settings.gameIntro === 'off';
  // Off, its tile dims as a switch's does, and there's nothing to play.
  const row = closestTo(select, '.ln-ext-setting', HTMLElement);
  if (row) setData(row, 'lnExtOn', off ? null : '');
  const play = queryOne(list, PLAY, HTMLButtonElement);
  if (play && play.disabled !== off) play.disabled = off;
}

/** Puts the preview in the intro's card of `list`, the card and the settings kept in step. */
export function wireIntroRow(list: HTMLElement): void {
  const preview = buildIntroPreview();
  queryOne(list, "[data-ln-ext-setting='gameIntro']", HTMLElement)?.append(preview.element);
  list.addEventListener('change', event => {
    const select = closestTo(event.target, SELECT, HTMLSelectElement);
    const kind = IntroKindSchema.safeParse(select?.value);
    if (!kind.success) return;
    void saveSetting('gameIntro', kind.data);
    preview.play(kind.data);
  });
  queryOne(preview.element, PLAY, HTMLButtonElement)?.addEventListener('click', () => {
    preview.play(currentSettings().gameIntro);
  });
  showIntroRow(list, currentSettings());
  onSettings(settings => showIntroRow(list, settings));
}
