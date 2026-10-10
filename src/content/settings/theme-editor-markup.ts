import { html, type SafeHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import { MAX_NAME, SCHEMES, type Scheme } from '#content/colors/themes.ts';
import { BADGES, mock } from './theme-cards.ts';

// The theme editor's markup: a name, then for each scheme a preview and the
// three things a palette is (the tint's hue, its strength, the accent).

/** The strength slider's steps, in thousandths of OKLCH chroma. */
export const CHROMA_STEPS = 1000;
export const MAX_CHROMA_STEP = 60;

function schemeFields(scheme: Scheme): SafeHtml {
  const title = message(scheme === 'light' ? 'schemeLight' : 'schemeDark');
  return html`<fieldset class="lr-ext-editor__scheme" data-lr-ext-editor-scheme="${scheme}">
    <legend class="lr-ext-editor__legend">${BADGES[scheme]}<span>${title}</span></legend>
    <span class="lr-ext-editor__preview">${mock(scheme, 'editor')}</span>
    <label class="lr-ext-editor__field">
      <span>${message('editorTint')}</span>
      <input type="range" class="lr-ext-editor__hue" min="0" max="360" step="1" data-lr-ext-field="hue" />
    </label>
    <label class="lr-ext-editor__field">
      <span>${message('editorStrength')}</span>
      <input type="range" class="lr-ext-editor__chroma" min="0" max="${MAX_CHROMA_STEP}" step="1" data-lr-ext-field="chroma" />
    </label>
    <label class="lr-ext-editor__field lr-ext-editor__field--accent">
      <span>${message('editorAccent')}</span>
      <input type="color" class="lr-ext-editor__accent" data-lr-ext-field="accent" />
      <code class="lr-ext-editor__hex"></code>
    </label>
    <p class="lr-ext-editor__warning" hidden>${message('editorLowContrast')}</p>
  </fieldset>`;
}

const action = (name: string, className: string, text: string): SafeHtml =>
  html`<button type="button" class="button ${className}" data-lr-ext-editor-action="${name}">${text}</button>`;

export const editorMarkup = (): SafeHtml =>
  html`<div class="lr-ext-editor__top">
      <h3 class="lr-ext-appearance__label lr-ext-editor__title"></h3>
      <input
        type="text"
        class="lr-ext-editor__name"
        maxlength="${MAX_NAME}"
        placeholder="${message('editorUntitled')}"
        aria-label="${message('editorName')}"
      />
    </div>
    <div class="lr-ext-editor__schemes">${SCHEMES.map(schemeFields)}</div>
    <div class="lr-ext-editor__actions">
      ${action('delete', 'button-red lr-ext-editor__delete', message('editorDelete'))}
      ${action('share', 'button-empty', message('editorShare'))}
      <span class="lr-ext-editor__spacer"></span>
      ${action('cancel', 'button-empty', message('editorCancel'))}
      ${action('save', '', message('editorSave'))}
    </div>`;
