import { closestTo, createElement, queryOne, setStyleProperty } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import { setPalette, showPalettes } from '#content/colors/apply.ts';
import { contrastWithWhite, MIN_CONTRAST_WITH_WHITE } from '#content/colors/contrast.ts';
import { themeCode } from '#content/colors/share.ts';
import { palettesOf, SCHEMES, type Palette, type Scheme } from '#content/colors/themes.ts';
import { currentSettings, updateSettings } from './settings.ts';
import { newThemeId, withoutTheme, withTheme } from './custom-themes.ts';
import { CHROMA_STEPS, editorMarkup } from './theme-editor-markup.ts';

// The theme editor, under the Appearance card's themes: a new theme, a copy of
// one, or one of the user's to change. While it's open the whole page shows
// the theme as it's made; closing without saving gives back the picked ones.

interface Draft {
  /** The user's theme being changed, or null for a new one. */
  readonly id: string | null;
  readonly name: string;
  readonly light: Palette;
  readonly dark: Palette;
}

export interface Editor {
  readonly element: HTMLElement;
  readonly open: (draft: Draft) => void;
}

const CONFIRM = 'lnExtConfirm';
const COPIED_MS = 1500;

const fieldOf = (scope: HTMLElement, name: string): HTMLInputElement | null =>
  queryOne(scope, `[data-ln-ext-field='${name}']`, HTMLInputElement);

const fieldset = (editor: HTMLElement, scheme: Scheme): HTMLElement | null =>
  queryOne(editor, `[data-ln-ext-editor-scheme='${scheme}']`, HTMLElement);

function writeFields(editor: HTMLElement, draft: Draft): void {
  const name = queryOne(editor, '.ln-ext-editor__name', HTMLInputElement);
  if (name) name.value = draft.name;
  for (const scheme of SCHEMES) {
    const scope = fieldset(editor, scheme);
    if (!scope) continue;
    const { hue, chroma, accent } = draft[scheme];
    const fields = { hue: String(hue), chroma: String(Math.round(chroma * CHROMA_STEPS)), accent };
    for (const [key, value] of Object.entries(fields)) {
      const field = fieldOf(scope, key);
      if (field) field.value = value;
    }
  }
}

function readPalette(scope: HTMLElement | null, fallback: Palette): Palette {
  if (!scope) return fallback;
  const chroma = fieldOf(scope, 'chroma')?.valueAsNumber;
  return {
    hue: fieldOf(scope, 'hue')?.valueAsNumber ?? fallback.hue,
    chroma: chroma === undefined ? fallback.chroma : chroma / CHROMA_STEPS,
    accent: fieldOf(scope, 'accent')?.value ?? fallback.accent,
  };
}

function readDraft(editor: HTMLElement, base: Draft): Draft {
  const name = queryOne(editor, '.ln-ext-editor__name', HTMLInputElement)?.value.trim() ?? '';
  return {
    id: base.id,
    name: name === '' ? message('editorUntitled') : name,
    light: readPalette(fieldset(editor, 'light'), base.light),
    dark: readPalette(fieldset(editor, 'dark'), base.dark),
  };
}

function showDraft(editor: HTMLElement, draft: Draft): void {
  for (const scheme of SCHEMES) {
    const scope = fieldset(editor, scheme);
    const preview = scope && queryOne(scope, '[data-ln-ext-palette]', HTMLElement);
    if (!scope || !preview) continue;
    const palette = draft[scheme];
    setPalette(preview, palette);
    setStyleProperty(scope, '--ln-ext-editor-hue', String(palette.hue));
    const hex = queryOne(scope, '.ln-ext-editor__hex', HTMLElement);
    if (hex) hex.textContent = palette.accent;
    const warning = queryOne(scope, '.ln-ext-editor__warning', HTMLElement);
    if (warning) warning.hidden = contrastWithWhite(palette.accent) >= MIN_CONTRAST_WITH_WHITE;
  }
  showPalettes(draft);
}

function restorePalettes(): void {
  const { colorThemes, customThemes } = currentSettings();
  showPalettes(palettesOf(colorThemes, customThemes));
}

async function copyCode(button: HTMLElement, draft: Draft): Promise<void> {
  await navigator.clipboard.writeText(themeCode(draft));
  const label = button.textContent;
  button.textContent = message('editorCopied');
  window.setTimeout(() => (button.textContent = label), COPIED_MS);
}

// What's open: the draft as it was opened, its fields holding the changes.
interface State {
  readonly element: HTMLElement;
  base: Draft | null;
}

function close(state: State): void {
  state.element.hidden = true;
  state.base = null;
  restorePalettes();
}

function save(state: State, made: Draft): void {
  const theme = {
    id: made.id ?? newThemeId(),
    name: made.name,
    light: made.light,
    dark: made.dark,
  };
  void updateSettings(settings => withTheme(settings, theme, made.id === null));
  close(state);
}

// Twice: the first click asks.
function remove(state: State, button: HTMLElement, id: string): void {
  if (button.dataset[CONFIRM] === undefined) {
    button.dataset[CONFIRM] = '';
    button.textContent = message('editorDeleteConfirm');
    return;
  }
  void updateSettings(settings => withoutTheme(settings, id));
  close(state);
}

function onClick(state: State, event: MouseEvent): void {
  const button = closestTo(event.target, '[data-ln-ext-editor-action]', HTMLElement);
  const made = state.base && readDraft(state.element, state.base);
  if (!button || !made) return;
  const action = button.dataset.lnExtEditorAction;
  if (action === 'save') save(state, made);
  else if (action === 'cancel') close(state);
  else if (action === 'share') void copyCode(button, made);
  else if (action === 'delete' && made.id !== null) remove(state, button, made.id);
}

function open(state: State, opened: Draft): void {
  const { element } = state;
  state.base = opened;
  writeFields(element, opened);
  const title = queryOne(element, '.ln-ext-editor__title', HTMLElement);
  if (title) title.textContent = message(opened.id === null ? 'editorNew' : 'editorEdit');
  const deleteButton = queryOne(element, '.ln-ext-editor__delete', HTMLElement);
  if (deleteButton) {
    deleteButton.hidden = opened.id === null;
    delete deleteButton.dataset[CONFIRM];
    deleteButton.textContent = message('editorDelete');
  }
  element.hidden = false;
  showDraft(element, opened);
  element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  queryOne(element, '.ln-ext-editor__name', HTMLInputElement)?.focus({ preventScroll: true });
}

/** The editor, hidden until opened. */
export function createEditor(): Editor {
  const element = createElement('div', { className: 'ln-ext-editor' });
  element.hidden = true;
  setHtml(element, editorMarkup());
  const state: State = { element, base: null };
  element.addEventListener('input', () => {
    if (state.base) showDraft(element, readDraft(element, state.base));
  });
  element.addEventListener('keydown', event => {
    if (event.key === 'Escape') close(state);
  });
  element.addEventListener('click', event => onClick(state, event));
  return { element, open: opened => open(state, opened) };
}
