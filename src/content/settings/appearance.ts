import Add01Icon from '@hugeicons/core-free-icons/Add01Icon';
import PaintBrush04Icon from '@hugeicons/core-free-icons/PaintBrush04Icon';
import { closestTo, createElement, queryAll, queryOne } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { ColorSchemeSchema, postColorScheme, type ColorScheme } from '#shared/protocol.ts';
import { message } from '#content/platform/runtime.ts';
import { setPalette } from '#content/colors/apply.ts';
import type { SharedTheme } from '#content/colors/share.ts';
import {
  allThemes,
  isCustom,
  palettesOf,
  type ColorTheme,
  type Scheme,
} from '#content/colors/themes.ts';
import {
  currentSettings,
  onSettings,
  saveSetting,
  updateSettings,
  type Settings,
} from './settings.ts';
import { canAddTheme, newThemeId, withTheme } from './custom-themes.ts';
import { createCodeForm, type CodeForm } from './theme-code-form.ts';
import { createEditor, type Editor } from './theme-editor.ts';
import { mock, themeMarkup, themeName } from './theme-cards.ts';

// The settings' Appearance card: Lichess's color scheme, as its own Theme menu
// sets it, over the color themes, one picked for each scheme, built-in or the
// user's own (theme-editor.ts). Every preview is drawn by the palette itself
// (`data-lr-ext-palette`), from the theme it shows.

const SCHEME_NAMES: Readonly<Record<ColorScheme, string>> = {
  system: 'schemeSystem',
  light: 'schemeLight',
  dark: 'schemeDark',
};

function schemeMarkup(scheme: ColorScheme): SafeHtml {
  const previews =
    scheme === 'system'
      ? [mock('light', 'picked'), mock('dark', 'picked')]
      : [mock(scheme, 'picked')];
  return html`<button type="button" class="lr-ext-scheme" data-lr-ext-scheme="${scheme}" aria-pressed="false">
    <span class="lr-ext-scheme__preview">${previews}</span>
    <span class="lr-ext-scheme__name">${message(SCHEME_NAMES[scheme])}</span>
  </button>`;
}

const schemeOf = (scheme: string | undefined): Scheme | null =>
  scheme === 'light' || scheme === 'dark' ? scheme : null;

const themeOf = (element: Element | null, settings: Settings): ColorTheme | undefined => {
  const id = closestTo(element, '.lr-ext-theme', HTMLElement)?.dataset.lrExtTheme;
  return allThemes(settings.customThemes).find(theme => theme.id === id);
};

function setPressed(button: HTMLElement, pressed: boolean): void {
  if (button.getAttribute('aria-pressed') !== String(pressed))
    button.setAttribute('aria-pressed', String(pressed));
}

function showThemes(card: HTMLElement, settings: Settings): void {
  const { colorThemes, customThemes } = settings;
  const palettes = palettesOf(colorThemes, customThemes);
  for (const preview of queryAll(card, "[data-lr-ext-mock='picked']", HTMLElement)) {
    const scheme = schemeOf(preview.dataset.lrExtPalette);
    if (scheme) setPalette(preview, palettes[scheme]);
  }
  for (const orb of queryAll(card, '.lr-ext-orb', HTMLElement)) {
    const scheme = schemeOf(orb.dataset.lrExtOrb);
    const theme = themeOf(orb, settings);
    if (!scheme || !theme) continue;
    setPalette(orb, theme[scheme]);
    setPressed(orb, colorThemes[scheme] === theme.id);
  }
  const full = !canAddTheme(settings);
  for (const button of queryAll(
    card,
    '[data-lr-ext-themes-action], .lr-ext-theme__action',
    HTMLButtonElement,
  ))
    button.disabled = full && button.dataset.lrExtThemeAction !== 'edit';
}

// The grid is drawn again only when the user's themes change.
function themesShower(card: HTMLElement): (settings: Settings) => void {
  let drawn: string | null = null;
  return settings => {
    const key = JSON.stringify(settings.customThemes);
    const grid = queryOne(card, '.lr-ext-themes', HTMLElement);
    if (grid && key !== drawn) {
      setHtml(grid, html`${allThemes(settings.customThemes).map(themeMarkup)}`);
      drawn = key;
    }
    showThemes(card, settings);
  };
}

/** Lichess's scheme, from what its Theme menu last set (`transp …` with a background picture). */
export function lichessScheme(): ColorScheme {
  const background = document.body.dataset.theme ?? '';
  return ColorSchemeSchema.options.find(scheme => background.includes(scheme)) ?? 'dark';
}

/** Marks the scheme Lichess shows: it may change from its own menu, so this runs every tick. */
export function showScheme(card: HTMLElement): void {
  const current = lichessScheme();
  for (const button of queryAll(card, '.lr-ext-scheme', HTMLElement))
    setPressed(button, button.dataset.lrExtScheme === current);
}

interface Tools {
  readonly editor: Editor;
  readonly codeForm: CodeForm;
}

function onThemeAction(action: string | undefined, theme: ColorTheme, { editor }: Tools): void {
  const { light, dark } = theme;
  if (action === 'edit' && isCustom(theme)) editor.open({ ...theme });
  else if (action === 'copy')
    editor.open({ id: null, name: message('themeCopyName', themeName(theme)), light, dark });
}

function onToolAction(action: string | undefined, { editor, codeForm }: Tools): void {
  const { colorThemes, customThemes } = currentSettings();
  if (action === 'create')
    editor.open({ id: null, name: '', ...palettesOf(colorThemes, customThemes) });
  else if (action === 'add') codeForm.toggle();
}

function onClick(event: MouseEvent, tools: Tools): void {
  const settings = currentSettings();
  const target = event.target instanceof Element ? event.target : null;
  const scheme = ColorSchemeSchema.safeParse(
    closestTo(target, '.lr-ext-scheme', HTMLElement)?.dataset.lrExtScheme,
  );
  if (scheme.success) return postColorScheme(scheme.data);
  const tool = closestTo(target, '[data-lr-ext-themes-action]', HTMLElement);
  if (tool) return onToolAction(tool.dataset.lrExtThemesAction, tools);
  const theme = themeOf(target, settings);
  if (!theme) return;
  const action = closestTo(target, '.lr-ext-theme__action', HTMLElement);
  if (action) return onThemeAction(action.dataset.lrExtThemeAction, theme, tools);
  const orbScheme = schemeOf(closestTo(target, '.lr-ext-orb', HTMLElement)?.dataset.lrExtOrb);
  if (orbScheme)
    void saveSetting('colorThemes', { ...settings.colorThemes, [orbScheme]: theme.id });
}

const addShared = (theme: SharedTheme): void =>
  void updateSettings(settings => withTheme(settings, { id: newThemeId(), ...theme }, true));

const toolMarkup = (action: string, icon: SafeHtml, label: string): SafeHtml =>
  html`<button type="button" class="lr-ext-appearance__tool" data-lr-ext-themes-action="${action}">${icon}<span>${label}</span></button>`;

/** The card, kept in step with the settings. */
export function buildAppearance(): HTMLElement {
  const card = createElement('section', { className: 'lr-ext-appearance' });
  setHtml(
    card,
    html`<div class="lr-ext-appearance__head">
        <span class="lr-ext-setting__icon" aria-hidden="true"></span>
        <div>
          <h2 class="lr-ext-setting__title">${message('appearanceTitle')}</h2>
          <p class="lr-ext-setting__body">${message('appearanceBody')}</p>
        </div>
      </div>
      <h3 class="lr-ext-appearance__label">${message('colorSchemeTitle')}</h3>
      <div class="lr-ext-schemes">${ColorSchemeSchema.options.map(schemeMarkup)}</div>
      <div class="lr-ext-appearance__row">
        <h3 class="lr-ext-appearance__label">${message('themesTitle')}</h3>
        ${toolMarkup('create', hugeicon(PaintBrush04Icon), message('themeCreate'))}
        ${toolMarkup('add', hugeicon(Add01Icon), message('themeAdd'))}
      </div>
      <div class="lr-ext-themes"></div>`,
  );
  const tools: Tools = { editor: createEditor(), codeForm: createCodeForm(addShared) };
  queryOne(card, '.lr-ext-appearance__row', HTMLElement)?.after(tools.codeForm.element);
  card.append(tools.editor.element);
  card.addEventListener('click', event => onClick(event, tools));
  const showAll = themesShower(card);
  showAll(currentSettings());
  showScheme(card);
  onSettings(showAll);
  return card;
}
