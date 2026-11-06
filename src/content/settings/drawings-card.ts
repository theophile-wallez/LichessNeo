import { DRAWING_TOPICS, type DrawingTopic, DrawingTopicSchema } from '#shared/coach-drawings.ts';
import { closestTo, queryAll, queryOne, setData, setStyleProperty } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import { previewMarkup } from './drawing-previews.ts';
import { currentSettings, onSettings, type Settings, updateSettings } from './settings.ts';
import { buildCardList } from './switch-list.ts';

// The setting of the coach's drawings on the board: all of them, none, or the
// kinds picked, a tile each (styles/pages/settings-drawings.css), whose
// drawing shows over it on a little board as it's hovered (drawing-previews.ts). None is the
// drawings' switch off (`coachBoard`); a kind left out is in
// `coachDrawingsHidden`, so a kind a later version adds shows at once.

const KINDS: Readonly<Record<DrawingTopic, readonly [string, string]>> = {
  mates: ['drawingMates', 'drawingMatesBody'],
  forks: ['drawingForks', 'drawingForksBody'],
  pins: ['drawingPins', 'drawingPinsBody'],
  lines: ['drawingLines', 'drawingLinesBody'],
  hanging: ['drawingHanging', 'drawingHangingBody'],
  checks: ['drawingChecks', 'drawingChecksBody'],
  threats: ['drawingThreats', 'drawingThreatsBody'],
  plans: ['drawingPlans', 'drawingPlansBody'],
  pawns: ['drawingPawns', 'drawingPawnsBody'],
  endings: ['drawingEndings', 'drawingEndingsBody'],
};

const PRESET = '.ln-ext-drawings__preset';
const KIND = '.ln-ext-drawing-kind';
const TITLE_ID = 'ln-ext-setting-coachBoard';

const kindMarkup = (topic: DrawingTopic): SafeHtml => {
  const [name, body] = KINDS[topic];
  return html`<button type="button" class="ln-ext-drawing-kind" data-ln-ext-topic="${topic}" aria-pressed="true">
    <span class="ln-ext-drawing-kind__icon" aria-hidden="true"></span>
    <span class="ln-ext-drawing-kind__text">
      <span class="ln-ext-drawing-kind__name">${message(name)}</span>
      <span class="ln-ext-drawing-kind__body">${message(body)}</span>
    </span>
    <span class="ln-ext-drawing-kind__check" aria-hidden="true"></span>
  </button>`;
};

// Built when the page is, as its words are read from the extension then.
const cardMarkup =
  (): SafeHtml => html`<div class="ln-ext-setting ln-ext-drawings" data-ln-ext-setting="coachBoard" data-ln-ext-on="">
  <span class="ln-ext-setting__icon" aria-hidden="true"></span>
  <div class="ln-ext-setting__text">
    <h2 class="ln-ext-setting__title" id="${TITLE_ID}">
      ${message('settingCoachBoard')}<span class="ln-ext-drawings__count" hidden></span>
    </h2>
    <p class="ln-ext-setting__body">${message('settingCoachBoardBody')}</p>
  </div>
  <div class="ln-ext-drawings__presets" role="group" aria-labelledby="${TITLE_ID}">
    <button type="button" class="ln-ext-drawings__preset" data-ln-ext-preset="all" aria-pressed="true">${message('drawingsAll')}</button>
    <button type="button" class="ln-ext-drawings__preset" data-ln-ext-preset="none" aria-pressed="false">${message('drawingsNone')}</button>
  </div>
  <div class="ln-ext-drawings__grid">${DRAWING_TOPICS.map(kindMarkup)}</div>
  <div class="ln-ext-drawings__preview" aria-hidden="true" hidden>
    <p class="ln-ext-drawings__preview-name"></p>
    <div class="ln-ext-drawings__preview-board"></div>
  </div>
</div>`;

/** The kinds the coach draws, as the settings say. */
const shownKinds = ({ coachBoard, coachDrawingsHidden }: Settings): DrawingTopic[] =>
  coachBoard ? DRAWING_TOPICS.filter(topic => !coachDrawingsHidden.includes(topic)) : [];

// The settings that draw `kinds`: none at all is the switch off.
const drawing = (settings: Settings, kinds: readonly DrawingTopic[]): Settings => ({
  ...settings,
  coachBoard: kinds.length > 0,
  coachDrawingsHidden:
    kinds.length > 0 ? DRAWING_TOPICS.filter(topic => !kinds.includes(topic)) : [],
});

const toggled = (settings: Settings, topic: DrawingTopic): Settings => {
  const shown = shownKinds(settings);
  const kinds = shown.includes(topic) ? shown.filter(kind => kind !== topic) : [...shown, topic];
  return drawing(settings, kinds);
};

function setPressed(element: HTMLElement, pressed: boolean): void {
  if (element.getAttribute('aria-pressed') !== String(pressed))
    element.setAttribute('aria-pressed', String(pressed));
}

function showDrawings(card: HTMLElement, settings: Settings): void {
  const shown = shownKinds(settings);
  const all = shown.length === DRAWING_TOPICS.length;
  setData(card, 'lnExtOn', shown.length > 0 ? '' : null);
  for (const preset of queryAll(card, PRESET, HTMLButtonElement)) {
    const kind = preset.dataset.lnExtPreset;
    setPressed(preset, kind === 'all' ? all : shown.length === 0);
  }
  for (const tile of queryAll(card, KIND, HTMLButtonElement)) {
    const topic = DrawingTopicSchema.safeParse(tile.dataset.lnExtTopic).data;
    setPressed(tile, topic !== undefined && shown.includes(topic));
  }
  // Only a pick of some says how many: all or none say it already.
  const count = queryOne(card, '.ln-ext-drawings__count', HTMLElement);
  if (!count) return;
  const some = !all && shown.length > 0;
  if (count.hidden === some) count.hidden = !some;
  const text = message('drawingsCount', String(shown.length), String(DRAWING_TOPICS.length));
  if (some && count.textContent !== text) count.textContent = text;
}

function change(target: EventTarget | null): ((settings: Settings) => Settings) | null {
  const preset = closestTo(target, PRESET, HTMLButtonElement)?.dataset.lnExtPreset;
  if (preset === 'all') return settings => drawing(settings, DRAWING_TOPICS);
  if (preset === 'none') return settings => drawing(settings, []);
  const tile = closestTo(target, KIND, HTMLButtonElement);
  const topic = DrawingTopicSchema.safeParse(tile?.dataset.lnExtTopic).data;
  return topic ? settings => toggled(settings, topic) : null;
}

// The preview over `tile`, centered on it within the card, above it unless
// the window's top would cut it.
function place(preview: HTMLElement, tile: HTMLElement, card: HTMLElement): void {
  const gap = 8;
  const width = preview.offsetWidth;
  const height = preview.offsetHeight;
  const centered = tile.offsetLeft + (tile.offsetWidth - width) / 2;
  const left = Math.max(0, Math.min(centered, card.clientWidth - width));
  const above = tile.getBoundingClientRect().top - height - gap > 0;
  const top = above ? tile.offsetTop - height - gap : tile.offsetTop + tile.offsetHeight + gap;
  setStyleProperty(preview, 'left', `${left}px`);
  setStyleProperty(preview, 'top', `${top}px`);
}

/**
 * Shows the drawing of the kind hovered, or focused, over its tile: drawn
 * anew each time, so it comes in as it does on the review's board.
 */
function previewKinds(card: HTMLElement): void {
  const preview = queryOne(card, '.ln-ext-drawings__preview', HTMLElement);
  const board = queryOne(card, '.ln-ext-drawings__preview-board', HTMLElement);
  const name = queryOne(card, '.ln-ext-drawings__preview-name', HTMLElement);
  const grid = queryOne(card, '.ln-ext-drawings__grid', HTMLElement);
  if (!preview || !board || !name || !grid) return;
  let shown: DrawingTopic | null = null;
  const show = (tile: HTMLElement | null): void => {
    const topic = DrawingTopicSchema.safeParse(tile?.dataset.lnExtTopic).data ?? null;
    if (topic === shown) return;
    shown = topic;
    preview.hidden = !tile || !topic;
    if (!tile || !topic) return;
    setHtml(board, previewMarkup(topic));
    name.textContent = message(KINDS[topic][0]);
    place(preview, tile, card);
  };
  // Between two tiles, the one shown stays: only leaving the grid hides it.
  grid.addEventListener('pointerover', event => {
    const tile = closestTo(event.target, KIND, HTMLElement);
    if (event.pointerType !== 'touch' && tile) show(tile);
  });
  grid.addEventListener('pointerleave', () => show(null));
  grid.addEventListener('focusin', event => show(closestTo(event.target, KIND, HTMLElement)));
  grid.addEventListener('focusout', () => show(null));
}

/** The card, kept in step with the settings. */
export function buildDrawingsCard(): HTMLElement {
  const list = buildCardList(cardMarkup());
  const card = queryOne(list, '.ln-ext-drawings', HTMLElement);
  list.addEventListener('click', event => {
    const next = change(event.target);
    if (next) void updateSettings(next);
  });
  if (card) {
    showDrawings(card, currentSettings());
    onSettings(settings => showDrawings(card, settings));
    previewKinds(card);
  }
  return list;
}
