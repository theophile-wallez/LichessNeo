import PlayIcon from '@hugeicons/core-free-icons/PlayIcon';
import RacingFlagIcon from '@hugeicons/core-free-icons/RacingFlagIcon';
import type { EndResults, GameResult } from '#shared/end-animation.ts';
import { closestTo, queryAll, queryOne, setData } from '#shared/dom.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { hugeicon, type HugeIcon } from '#shared/hugeicons.ts';
import { message } from '#content/platform/runtime.ts';
import { themeAccent } from '#content/board-wave/accent.ts';
import { winPalette } from '#content/board-wave/plan.ts';
import type { WinColor } from '#content/board-wave/win-colors.ts';
import {
  choiceOf,
  endListMarkup,
  introListMarkup,
  showChoices,
  type Choice,
} from './animation-options.ts';
import type { EndShow } from './end-preview.ts';
import { buildIntroPreview, type IntroPreview } from './intro-preview.ts';
import { currentSettings, onSettings, saveSetting, type Settings } from './settings.ts';
import { buildCardList } from './switch-list.ts';

// The setting of a game's animations: a card like the rating's (rating-row.ts),
// with the intros at its start and what plays at its end under two tabs, beside
// a preview that plays the one picked (intro-preview.ts). As the board tiles do
// (looks-hover.ts), an option plays there as soon as the pointer comes over it;
// a touch picks it at once.

type Tab = 'start' | 'end';

const PICKER = '.ln-ext-intro-picker';
const TAB = '.ln-ext-intro-picker__tabs button';
const PLAY = '.ln-ext-intro-preview__play';

/** The result a results option shows its end after: the one it adds. */
const SHOWN_RESULT: Readonly<Record<EndResults, GameResult>> = {
  win: 'win',
  notLoss: 'draw',
  all: 'loss',
};

const tab = (name: Tab, icon: HugeIcon, label: string): SafeHtml =>
  html`<button type="button" role="tab" data-ln-ext-tab="${name}">${hugeicon(icon)}<span>${label}</span></button>`;

function cardMarkup(): SafeHtml {
  const id = 'ln-ext-setting-gameIntro';
  return html`<div class="ln-ext-setting" data-ln-ext-setting="gameIntro" data-ln-ext-on="">
    <span class="ln-ext-setting__icon" aria-hidden="true"></span>
    <div class="ln-ext-setting__text">
      <h2 class="ln-ext-setting__title" id="${id}">${message('settingGameIntro')}</h2>
      <p class="ln-ext-setting__body">${message('settingGameIntroBody')}</p>
    </div>
    <div class="ln-ext-intro-picker">
      <div class="ln-ext-intro-picker__side">
        <div class="ln-ext-intro-picker__tabs" role="tablist">
          ${tab('start', PlayIcon, message('animationsStart'))}${tab('end', RacingFlagIcon, message('animationsEnd'))}
        </div>
        ${introListMarkup(id)}${endListMarkup(id)}
      </div>
    </div>
  </div>`;
}

function showCard(list: HTMLElement, settings: Settings, shown: Tab): void {
  showChoices(list, settings);
  for (const button of queryAll(list, TAB, HTMLButtonElement)) {
    const active = button.dataset.lnExtTab === shown;
    button.classList.toggle('active', active);
    button.ariaSelected = String(active);
  }
  for (const panel of queryAll(list, '[data-ln-ext-panel]', HTMLElement)) {
    const hidden = panel.dataset.lnExtPanel !== shown;
    if (panel.hidden !== hidden) panel.hidden = hidden;
  }
  const introOff = settings.gameIntro === 'off';
  const endOff = settings.endAnimation === 'none';
  // With nothing at either end, its tile dims as a switch's does.
  const row = queryOne(list, "[data-ln-ext-setting='gameIntro']", HTMLElement);
  if (row) setData(row, 'lnExtOn', introOff && endOff ? null : '');
  const play = queryOne(list, PLAY, HTMLButtonElement);
  const nothing = shown === 'start' ? introOff : endOff;
  if (play && play.disabled !== nothing) play.disabled = nothing;
}

interface EndPicks {
  readonly pick?: EndShow['pick'];
  readonly result?: GameResult;
  readonly color?: WinColor;
}

/** The end as the settings pick it, a win by default, with `picks` over them. */
function endShow({ pick, result = 'win', color }: EndPicks = {}): EndShow {
  const settings = currentSettings();
  const win = winPalette(color ?? settings.endWinColor, themeAccent());
  return { pick: pick ?? settings.endAnimation, result, win };
}

function playChoice(preview: IntroPreview, choice: Choice): void {
  switch (choice.key) {
    case 'gameIntro':
      return preview.play(choice.value);
    case 'endAnimation':
      return preview.playEnd(endShow({ pick: choice.value }));
    case 'endResults':
      return preview.playEnd(endShow({ result: SHOWN_RESULT[choice.value] }));
    case 'endWinColor':
      return preview.playEnd(endShow({ pick: 'wave', color: choice.value }));
  }
}

const sameChoice = (one: Choice | undefined, other: Choice | undefined): boolean =>
  one?.key === other?.key && one?.value === other?.value;

/** Plays each option of `picker` as it's hovered; returns the one under the pointer. */
function playOnHover(picker: HTMLElement, preview: IntroPreview): () => Choice | undefined {
  let hovered: Choice | undefined;
  picker.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    const choice = choiceOf(event.target);
    // Between two options, the one playing goes on.
    if (choice === undefined || sameChoice(choice, hovered)) return;
    hovered = choice;
    if (!closestTo(event.target, '.disabled', HTMLElement)) playChoice(preview, choice);
  });
  picker.addEventListener('pointerleave', () => {
    hovered = undefined;
  });
  return () => hovered;
}

function save(choice: Choice): void {
  switch (choice.key) {
    case 'gameIntro':
      return void saveSetting('gameIntro', choice.value);
    case 'endAnimation':
      return void saveSetting('endAnimation', choice.value);
    case 'endResults':
      return void saveSetting('endResults', choice.value);
    case 'endWinColor':
      return void saveSetting('endWinColor', choice.value);
  }
}

/** The card, its preview in it, kept in step with the settings. */
export function buildAnimationsCard(): HTMLElement {
  const list = buildCardList(cardMarkup());
  const picker = queryOne(list, PICKER, HTMLElement);
  if (!picker) return list;
  let shown: Tab = 'start';
  const preview = buildIntroPreview();
  picker.append(preview.element);
  const hovered = playOnHover(picker, preview);
  picker.addEventListener('change', event => {
    const choice = choiceOf(event.target);
    if (choice === undefined) return;
    save(choice);
    // Picked with a click, it's playing already.
    if (!sameChoice(choice, hovered())) playChoice(preview, choice);
  });
  picker.addEventListener('click', event => {
    const tab = closestTo(event.target, TAB, HTMLButtonElement)?.dataset.lnExtTab;
    if (tab !== 'start' && tab !== 'end') return;
    shown = tab;
    showCard(list, currentSettings(), shown);
  });
  queryOne(preview.element, PLAY, HTMLButtonElement)?.addEventListener('click', () => {
    const settings = currentSettings();
    if (shown === 'start') preview.play(settings.gameIntro);
    else preview.playEnd(endShow());
  });
  showCard(list, currentSettings(), shown);
  onSettings(settings => showCard(list, settings, shown));
  return list;
}
