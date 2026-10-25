import { html, type SafeHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { avatarAttributes } from '#shared/own-avatar.ts';
import { message } from '#content/platform/runtime.ts';
import type { Entry, EntryIcon } from './entries.ts';

// The palette's list, as markup: its entries under their group's name, the one picked
// marked for the keyboard (styles/command-palette.css). A picture's file is set on its
// element after, as a style property: the page's CSP drops inline style attributes.

export const ROW_ID = 'ln-ext-palette-row';

const GROUP_NAMES: Readonly<Record<Entry['group'], string>> = {
  players: 'paletteGroupPlayers',
  pages: 'paletteGroupPages',
  actions: 'paletteGroupActions',
};

function iconMarkup(icon: EntryIcon): SafeHtml {
  if (icon.kind === 'picture') return html`<span class="ln-ext-palette__picture"></span>`;
  if (icon.kind === 'avatar')
    return html`<span class="ln-ext-palette__avatar"${avatarAttributes(icon.user)}></span>`;
  return html`<span class="ln-ext-palette__tile" data-ln-ext-hue="${icon.hue}">${hugeicon(
    icon.icon,
  )}</span>`;
}

function rowContent(entry: Entry): SafeHtml {
  return html`${iconMarkup(entry.icon)}${
    entry.online ? html`<span class="ln-ext-palette__online"></span>` : null
  }<span class="ln-ext-palette__label">${
    entry.title ? html`<span class="ln-ext-palette__title">${entry.title}</span> ` : null
  }${entry.label}</span>${
    entry.detail ? html`<span class="ln-ext-palette__detail">${entry.detail}</span>` : null
  }`;
}

function rowMarkup(entry: Entry, index: number, picked: boolean): SafeHtml {
  const attributes = html`id="${ROW_ID}-${index}" class="ln-ext-palette__row" role="option"
    data-ln-ext-index="${index}" aria-selected="${String(picked)}" tabindex="-1"`;
  return entry.href
    ? html`<a ${attributes} href="${entry.href}">${rowContent(entry)}</a>`
    : html`<button ${attributes} type="button">${rowContent(entry)}</button>`;
}

/** The entries under their groups' names, in the order given, `picked` marked. */
export function listMarkup(entries: readonly Entry[], picked: number, waiting: boolean): SafeHtml {
  if (entries.length === 0)
    return waiting
      ? html``
      : html`<p class="ln-ext-palette__empty">${message('paletteNothing')}</p>`;
  const parts = entries.map((entry, index) => {
    const row = rowMarkup(entry, index, index === picked);
    if (entry.group === entries[index - 1]?.group) return row;
    const name = message(GROUP_NAMES[entry.group]);
    return html`<p class="ln-ext-palette__heading" role="presentation">${name}</p>${row}`;
  });
  return html`${parts}`;
}
