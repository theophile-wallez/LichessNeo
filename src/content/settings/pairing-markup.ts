import Add01Icon from '@hugeicons/core-free-icons/Add01Icon';
import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon';
import ArrowUp01Icon from '@hugeicons/core-free-icons/ArrowUp01Icon';
import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon';
import Edit02Icon from '@hugeicons/core-free-icons/Edit02Icon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import { gameRatingColor } from '#shared/charts/colors.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { message } from '#content/platform/runtime.ts';
import { pickKey, type CardPick } from '#content/pages/speed-cards/picks.ts';
import { formMarkup } from './pairing-form.ts';
import { perfOfPick, pickDetail, pickName } from './pairing-names.ts';
import type { Suggestion } from './pairing-suggestions.ts';

// The markup of the settings' Quick pairing page (styles/pages/settings-pairing.css):
// the home's cards in their order, the suggestions, and the form that makes a
// card of the player's own (pairing-form.ts). Every card is a row: its rating's glyph and color,
// its name, its time controls, and its buttons.

interface RowOptions {
  readonly actions: SafeHtml;
  /** Beside the name: how much the player plays it. */
  readonly note?: string;
  /** The form has it, to change it. */
  readonly editing?: boolean;
}

function row(pick: CardPick, { actions, note, editing = false }: RowOptions): SafeHtml {
  const perf = perfOfPick(pick);
  const color = `--ln-ext-speed-color: ${gameRatingColor(perf)}`;
  const modifiers = `${note ? ' ln-ext-pairing__row--noted' : ''}${editing ? ' ln-ext-pairing__row--editing' : ''}`;
  return html`<li class="ln-ext-pairing__row${modifiers}" data-ln-ext-key="${pickKey(pick)}" data-ln-ext-speed="${perf}" style="${color}">
    <span class="ln-ext-pairing__glyph" aria-hidden="true"></span>
    <span class="ln-ext-pairing__text">
      <strong class="ln-ext-pairing__name">${pickName(pick)}</strong>
      <span class="ln-ext-pairing__detail">${pickDetail(pick)}</span>
    </span>
    ${note && html`<span class="ln-ext-pairing__games">${note}</span>`}
    <span class="ln-ext-pairing__actions">${actions}</span>
  </li>`;
}

const action = (name: string, icon: SafeHtml, label: string, enabled: boolean): SafeHtml =>
  html`<button type="button" class="ln-ext-pairing__action" data-ln-ext-action="${name}" title="${label}" aria-label="${label}" ${!enabled && html`disabled`}>${icon}</button>`;

/** The home's cards, each with its buttons to change it, move it and take it off. */
export function picksMarkup(picks: readonly CardPick[], editing: string | null): SafeHtml {
  const last = picks.length - 1;
  return html`${picks.map((pick, index) =>
    row(pick, {
      editing: pickKey(pick) === editing,
      actions: html`${action('edit', hugeicon(Edit02Icon), message('pairingEdit'), true)}
        ${action('up', hugeicon(ArrowUp01Icon), message('pairingMoveUp'), index > 0)}
        ${action('down', hugeicon(ArrowDown01Icon), message('pairingMoveDown'), index < last)}
        ${action('remove', hugeicon(Delete02Icon), message('pairingRemove'), last > 0)}`,
    }),
  )}`;
}

const addButton = (enabled: boolean): SafeHtml =>
  html`<button type="button" class="ln-ext-pairing__add" data-ln-ext-action="add" ${!enabled && html`disabled`}>
    ${hugeicon(Add01Icon)}<span>${message('pairingAdd')}</span>
  </button>`;

/** The suggestions, each with its button to add it, unless the home is full. */
export const suggestionsMarkup = (suggestions: readonly Suggestion[], full: boolean): SafeHtml =>
  html`${suggestions.map(({ pick, games }) =>
    row(pick, {
      actions: addButton(!full),
      note: games > 0 ? message('pairingGames', String(games)) : message('pairingDefaultCard'),
    }),
  )}`;

// As many rows as the suggestions often come to, while the recent games are read.
const SKELETON_ROWS = 3;

/** The suggestions' rows before they're known: their shapes, shimmering. */
export const skeletonMarkup = (): SafeHtml =>
  html`${Array.from(
    { length: SKELETON_ROWS },
    (_, index) =>
      html`<li class="ln-ext-pairing__row ln-ext-pairing__row--noted ln-ext-pairing__row--skeleton" ${
        index === 0
          ? html`role="status" aria-label="${message('pairingSuggestionsLoading')}"`
          : html`aria-hidden="true"`
      }>
        <span class="ln-ext-pairing__glyph"></span>
        <span class="ln-ext-pairing__text">
          <span class="ln-ext-pairing__bone"></span>
          <span class="ln-ext-pairing__bone ln-ext-pairing__bone--short"></span>
        </span>
        <span class="ln-ext-pairing__bone ln-ext-pairing__bone--pill"></span>
        <span class="ln-ext-pairing__bone ln-ext-pairing__bone--button"></span>
      </li>`,
  )}`;

const saveButtons = (enabled: boolean): SafeHtml =>
  html`<button type="button" class="ln-ext-pairing__cancel" data-ln-ext-action="cancel">${message('pairingCancel')}</button>
    <button type="button" class="ln-ext-pairing__add" data-ln-ext-action="save" ${!enabled && html`disabled`}>
      ${hugeicon(Tick02Icon)}<span>${message('pairingSave')}</span>
    </button>`;

/** The made card's row, with its button to add it, or to save it in place of the card changed. */
export const previewMarkup = (pick: CardPick, enabled: boolean, editing: boolean): SafeHtml =>
  row(pick, { actions: editing ? saveButtons(enabled) : addButton(enabled) });

interface CardOptions {
  readonly name: string;
  readonly title: string;
  readonly body: string;
  readonly content: SafeHtml;
  readonly tool?: SafeHtml;
}

const card = ({ name, title, body, content, tool }: CardOptions): SafeHtml =>
  html`<section class="ln-ext-pairing" data-ln-ext-pairing="${name}">
    <div class="ln-ext-pairing__head">
      <span class="ln-ext-setting__icon" aria-hidden="true"></span>
      <div class="ln-ext-setting__text">
        <h2 class="ln-ext-setting__title">${title}</h2>
        <p class="ln-ext-setting__body">${body}</p>
      </div>
      ${tool}
    </div>
    ${content}
  </section>`;

/** The page's three cards, their lists drawn into `.ln-ext-pairing__rows`. */
export const pageMarkup = (): SafeHtml =>
  html`${card({
    name: 'cards',
    title: message('pairingCardsTitle'),
    body: message('pairingCardsBody'),
    tool: html`<button type="button" class="ln-ext-pairing__reset" data-ln-ext-action="reset">${message('pairingReset')}</button>`,
    content: html`<ul class="ln-ext-pairing__rows"></ul>`,
  })}
  ${card({
    name: 'suggestions',
    title: message('pairingSuggestionsTitle'),
    body: message('pairingSuggestionsBody'),
    content: html`<ul class="ln-ext-pairing__rows"></ul><p class="ln-ext-pairing__note"></p>`,
  })}
  ${card({
    name: 'create',
    title: message('pairingCreateTitle'),
    body: message('pairingCreateBody'),
    content: formMarkup(),
  })}`;
