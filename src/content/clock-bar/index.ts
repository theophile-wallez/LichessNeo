import { createElement, onDomReady, queryAll, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { message } from '#content/platform/runtime.ts';
import { onSettings, saveSetting, type Settings } from '#content/settings/settings.ts';

// Lichess shows its clock bar by default, Neo doesn't: it shows only once the user picks Yes
// for it on Lichess's preferences page, whose radios show Neo's choice rather than the
// account's (styles/game/layout.css). Lichess saves the pick to the account as usual.

const RADIOS = "input[type='radio'][name='clock.bar']";

let radios: HTMLInputElement[] = [];

function show({ clockBar }: Settings): void {
  setData(document.documentElement, 'lnExtClockBar', clockBar ? '' : null);
  for (const radio of radios) radio.checked = (radio.value === '1') === clockBar;
}

function followRadios(): void {
  radios = queryAll(document, RADIOS, HTMLInputElement);
  for (const radio of radios) {
    radio.addEventListener('change', () => void saveSetting('clockBar', radio.value === '1'));
    if (radio.value === '0') radio.nextElementSibling?.append(neoTag());
  }
}

const neoTag = (): HTMLElement =>
  createElement('span', { className: 'ln-ext-neo-default', text: message('prefNeoDefault') });

export const clockBar: Feature = {
  name: 'clock bar',
  start: () => {
    onSettings(show);
    onDomReady(followRadios);
  },
};
