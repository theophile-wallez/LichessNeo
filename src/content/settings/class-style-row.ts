import MoreHorizontalIcon from '@hugeicons/core-free-icons/MoreHorizontalIcon';
import StarIcon from '@hugeicons/core-free-icons/StarIcon';
import { html } from '#shared/html.ts';
import { hugeicon, type HugeIcon } from '#shared/hugeicons.ts';
import { message } from '#content/platform/runtime.ts';
import { buildSelectRow } from './select-row.ts';

// The setting of the review's badges for best, excellent and good moves: a
// star, a thumb up and a tick, or three, two and one dots (select-row.ts).

const optionIcon = (icon: HugeIcon) =>
  html`<span class="ln-ext-setting__option-icon">${hugeicon(icon)}</span>`;

/** The card, kept in step with the settings. */
export const buildClassStyleRow = (): HTMLElement =>
  buildSelectRow({
    key: 'classStyle',
    title: message('settingClassStyle'),
    body: message('settingClassStyleBody'),
    options: [
      { value: 'icons', label: message('classStyleIcons'), icon: optionIcon(StarIcon) },
      { value: 'dots', label: message('classStyleDots'), icon: optionIcon(MoreHorizontalIcon) },
    ],
  });
