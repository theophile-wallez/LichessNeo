import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import { coachOf, coachPick } from '#shared/coach.ts';
import { closestTo, createElement, queryAll, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { html, setHtml } from '#shared/html.ts';
import { onCoachPicker, postCoachPicked } from '#shared/protocol.ts';
import { message } from '#content/platform/runtime.ts';
import { chooseCoach } from '#content/bootstrap/coach-choice.ts';
import { coachChoices, tilePick } from './names.ts';

// The Game Review's coach picker: a click on the coach (page/review/view/clicks.ts)
// opens every coach in a dialog (styles/coach-picker.css), rather than skipping to
// the next. It's here because the coaches' names are the extension's messages.

const TITLE_ID = 'ln-ext-coach-picker-title';

function buildDialog(): HTMLDialogElement {
  const dialog = createElement('dialog', {
    className: 'ln-ext-coach-picker',
    attrs: { 'aria-labelledby': TITLE_ID },
  });
  setHtml(
    dialog,
    html`<div class="ln-ext-coach-picker__card">
      <div class="ln-ext-coach-picker__head">
        <span class="ln-ext-setting__icon" aria-hidden="true"></span>
        <div>
          <h2 class="ln-ext-coach-picker__title" id="${TITLE_ID}">${message('coachPickerTitle')}</h2>
          <p class="ln-ext-coach-picker__body">${message('coachPickerBody')}</p>
        </div>
        <button type="button" class="ln-ext-coach-picker__close" aria-label="${message('coachPickerClose')}">${hugeicon(Cancel01Icon)}</button>
      </div>
      <div class="ln-ext-coach-picker__grid">${coachChoices()}</div>
    </div>`,
  );
  dialog.addEventListener('click', event => {
    // A click on the backdrop lands on the dialog itself, outside its card.
    const close =
      event.target === dialog || closestTo(event.target, '.ln-ext-coach-picker__close', Element);
    const picked = tilePick(event.target);
    if (picked !== null) {
      chooseCoach(picked);
      // With none, the stylesheet takes the review's coach away (styles/coach-avatar.css).
      const coach = coachOf(picked);
      if (coach !== null) postCoachPicked(coach);
    }
    if (close || picked !== null) dialog.close();
  });
  return dialog;
}

let dialog: HTMLDialogElement | null = null;

/** Opens the picker over the page, the pick kept pressed and focused: at random, its tile. */
export function openCoachPicker(): void {
  dialog ??= buildDialog();
  if (!dialog.isConnected) document.body.append(dialog);
  const pick = String(coachPick());
  for (const choice of queryAll(dialog, '.ln-ext-coach-choice', HTMLElement))
    choice.setAttribute('aria-pressed', String(choice.dataset.lnExtCoachChoice === pick));
  if (!dialog.open) dialog.showModal();
  queryOne(dialog, '.ln-ext-coach-choice[aria-pressed="true"]', HTMLElement)?.focus();
}

export const coachPicker: Feature = {
  name: 'coach picker',
  start: () => {
    onCoachPicker(() => openCoachPicker());
  },
};
