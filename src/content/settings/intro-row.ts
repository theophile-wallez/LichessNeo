import { closestTo, queryAll, queryOne, setData } from '#shared/dom.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import { INTRO_KINDS, IntroKindSchema, type IntroKind } from '#content/game/intro/kinds.ts';
import { buildIntroPreview, type IntroPreview } from './intro-preview.ts';
import { currentSettings, onSettings, saveSetting, type Settings } from './settings.ts';

// The setting of the players' intro at a game's start: a card like the
// rating's (rating-row.ts), with a list of the intros, "No animation" first,
// beside a preview that plays the one picked (intro-preview.ts). As the board
// tiles do (looks-hover.ts), an intro plays there as soon as the pointer comes
// over it; a touch picks it at once.

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

const PICKER = '.ln-ext-intro-picker';
const OPTION = '.ln-ext-intro-option';
const PLAY = '.ln-ext-intro-preview__play';

export function introRowMarkup(): SafeHtml {
  const id = 'ln-ext-setting-gameIntro';
  const options = INTRO_KINDS.map(
    kind => html`<label class="ln-ext-intro-option">
      <input type="radio" name="ln-ext-gameIntro" value="${kind}" /><span>${message(KIND_NAMES[kind])}</span>
    </label>`,
  );
  return html`<div class="ln-ext-setting" data-ln-ext-setting="gameIntro" data-ln-ext-on="">
    <span class="ln-ext-setting__icon" aria-hidden="true"></span>
    <div class="ln-ext-setting__text">
      <h2 class="ln-ext-setting__title" id="${id}">${message('settingGameIntro')}</h2>
      <p class="ln-ext-setting__body">${message('settingGameIntroBody')}</p>
    </div>
    <div class="ln-ext-intro-picker">
      <div class="ln-ext-intro-picker__list" role="radiogroup" aria-labelledby="${id}">${options}</div>
    </div>
  </div>`;
}

function kindOf(target: EventTarget | null): IntroKind | undefined {
  const option = closestTo(target, OPTION, HTMLElement);
  const input = option && queryOne(option, 'input', HTMLInputElement);
  return IntroKindSchema.safeParse(input?.value).data;
}

function showIntroRow(list: HTMLElement, settings: Settings): void {
  for (const input of queryAll(list, `${OPTION} input`, HTMLInputElement)) {
    const picked = input.value === settings.gameIntro;
    if (input.checked !== picked) input.checked = picked;
    closestTo(input, OPTION, HTMLElement)?.classList.toggle('active', picked);
  }
  const off = settings.gameIntro === 'off';
  // Off, its tile dims as a switch's does, and there's nothing to play.
  const row = queryOne(list, "[data-ln-ext-setting='gameIntro']", HTMLElement);
  if (row) setData(row, 'lnExtOn', off ? null : '');
  const play = queryOne(list, PLAY, HTMLButtonElement);
  if (play && play.disabled !== off) play.disabled = off;
}

/** Plays each intro of `picker` as it's hovered; returns the one under the pointer. */
function playOnHover(picker: HTMLElement, preview: IntroPreview): () => IntroKind | undefined {
  let hovered: IntroKind | undefined;
  picker.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    const kind = kindOf(event.target);
    // Between two options, the one playing goes on.
    if (kind === undefined || kind === hovered) return;
    hovered = kind;
    preview.play(kind);
  });
  picker.addEventListener('pointerleave', () => {
    hovered = undefined;
  });
  return () => hovered;
}

/** Puts the preview in the intro's card of `list`, the card and the settings kept in step. */
export function wireIntroRow(list: HTMLElement): void {
  const picker = queryOne(list, PICKER, HTMLElement);
  if (!picker) return;
  const preview = buildIntroPreview();
  picker.append(preview.element);
  const hovered = playOnHover(picker, preview);
  picker.addEventListener('change', event => {
    const kind = kindOf(event.target);
    if (kind === undefined) return;
    void saveSetting('gameIntro', kind);
    // Picked with a click, it's playing already.
    if (kind !== hovered()) preview.play(kind);
  });
  queryOne(preview.element, PLAY, HTMLButtonElement)?.addEventListener('click', () => {
    preview.play(currentSettings().gameIntro);
  });
  showIntroRow(list, currentSettings());
  onSettings(settings => showIntroRow(list, settings));
}
