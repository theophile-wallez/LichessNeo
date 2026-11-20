import AiChipIcon from '@hugeicons/core-free-icons/AiChipIcon';
import Alert02Icon from '@hugeicons/core-free-icons/Alert02Icon';
import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon';
import CpuIcon from '@hugeicons/core-free-icons/CpuIcon';
import DashboardSpeed02Icon from '@hugeicons/core-free-icons/DashboardSpeed02Icon';
import InformationCircleIcon from '@hugeicons/core-free-icons/InformationCircleIcon';
import MinusSignIcon from '@hugeicons/core-free-icons/MinusSignIcon';
import PlusSignIcon from '@hugeicons/core-free-icons/PlusSignIcon';
import Refresh01Icon from '@hugeicons/core-free-icons/Refresh01Icon';
import Settings02Icon from '@hugeicons/core-free-icons/Settings02Icon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import Timer02Icon from '@hugeicons/core-free-icons/Timer02Icon';
import UndoIcon from '@hugeicons/core-free-icons/UndoIcon';
import { html, type SafeHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { deviceCores } from './device.ts';
import { CAPS, CURVE_DEPTH, DEFAULT_REVIEW_ENGINE, HASHES, MIN_DEPTH, TIERS } from './options.ts';
import type { EngineWords } from './words.ts';

// The engine panel's markup, the popover's and the settings page's: the parts
// they share, bound to the settings by their data attributes (panel.ts).

export const modMarkup = (field: string): SafeHtml =>
  html`<i class="ln-ext-engine__mod" data-ln-ext-mod="${field}"></i>`;

const bind = (name: string): SafeHtml => html`<span data-ln-ext-bind="${name}"></span>`;

export const stepperMarkup = (field: string, words: EngineWords): SafeHtml =>
  html`<span class="ln-ext-engine__stepper"><button type="button" data-ln-ext-act="${field}:-1" aria-label="${words.less}">${hugeicon(MinusSignIcon)}</button><output data-ln-ext-bind="${field}"></output><button type="button" data-ln-ext-act="${field}:1" aria-label="${words.more}">${hugeicon(PlusSignIcon)}</button></span>`;

const reveal = (when: string, inner: SafeHtml): SafeHtml =>
  html`<div class="ln-ext-engine__reveal" data-ln-ext-when="${when}" data-ln-ext-reveal="height" hidden><div class="ln-ext-engine__reveal-inner">${inner}</div></div>`;

export const resetMarkup = (label: string): SafeHtml =>
  html`<div class="ln-ext-engine__reset"><button type="button" class="ln-ext-engine__ghost" data-ln-ext-act="reset" disabled>${hugeicon(UndoIcon)}${label}</button></div>`;

/** A step down or up of the depth, past the slider's end too. */
const nudgeMarkup = (words: EngineWords): SafeHtml =>
  html`<span class="ln-ext-engine__nudge"><button type="button" data-ln-ext-act="deeper:1" aria-label="${words.deeper}">${hugeicon(PlusSignIcon)}</button><button type="button" data-ln-ext-act="deeper:-1" aria-label="${words.shallower}">${hugeicon(MinusSignIcon)}</button></span>`;

/** The depth in big figures, its steps, its level, and the time it takes. */
export const dialMarkup = (words: EngineWords, page: boolean): SafeHtml =>
  html`<div class="ln-ext-engine__dial">
    <span class="ln-ext-engine__figures"><span class="ln-ext-engine__roll"><span class="ln-ext-engine__depth" data-ln-ext-bind="depth" data-ln-ext-swap="roll"></span></span>${nudgeMarkup(words)}</span>
    <span class="ln-ext-engine__dial-meta"><span class="ln-ext-engine__unit">${words.depth} ${modMarkup('depth')}</span><span class="ln-ext-engine__pill" data-ln-ext-bind="tier" data-ln-ext-swap="fade"></span></span>
    <span class="ln-ext-engine__dial-meta ln-ext-engine__dial-time"><span class="ln-ext-engine__unit">${page ? words.forAGame : words.forThisGame}</span><span class="ln-ext-engine__estimate">${hugeicon(Timer02Icon)}${bind('estimate')}<small>${bind('layout')}</small></span></span>
  </div>`;

/** The curve, the depth's slider under it, its levels, the legend. */
export const curveMarkup = (words: EngineWords, page: boolean): SafeHtml =>
  html`<svg class="ln-ext-engine-curve${page ? ' ln-ext-engine-curve--big' : ''}" aria-hidden="true"></svg>
  <input type="range" class="ln-ext-engine__range" min="${MIN_DEPTH}" max="${CURVE_DEPTH}" step="1" data-ln-ext-input="depth" aria-label="${words.depth}">
  <div class="ln-ext-engine__stops"><span class="ln-ext-engine__stops-thumb"></span>${TIERS.map(
    tier =>
      html`<button type="button" data-ln-ext-act="depth:${tier.depth}" data-ln-ext-stop="${tier.depth}" data-ln-ext-default="${String(tier.depth === DEFAULT_REVIEW_ENGINE.depth)}" data-ln-ext-hue="${tier.hue}" style="--ln-ext-at:${(tier.depth - MIN_DEPTH) / (CURVE_DEPTH - MIN_DEPTH)}" title="${words.tiers[tier.id]}">${tier.depth}</button>`,
  )}</div>
  ${reveal('past', html`<div class="ln-ext-engine__note ln-ext-engine__note--warn">${hugeicon(Alert02Icon)}<span>${words.pastCurve}</span></div>`)}
  <div class="ln-ext-engine__legend"><span><i></i>${bind('chosenEngine')}</span><span><i class="ln-ext-engine__dashed"></i>${bind('otherEngine')}</span><span>${words.hint}</span></div>`;

export const kindSwitchMarkup = (words: EngineWords): SafeHtml =>
  html`<span class="ln-ext-engine__switch"><button type="button" data-ln-ext-act="engine:light" data-ln-ext-kind="light">${words.kinds.light}</button><button type="button" data-ln-ext-act="engine:full" data-ln-ext-kind="full">${words.kinds.full}</button></span>`;

export const toastMarkup = (): SafeHtml =>
  reveal(
    'toast',
    html`<div class="ln-ext-engine__note ln-ext-engine__note--info">${hugeicon(InformationCircleIcon)}${bind('toast')}</div>`,
  );

export const warningMarkup = (words: EngineWords): SafeHtml =>
  reveal(
    'warn',
    html`<div class="ln-ext-engine__note ln-ext-engine__note--warn">${hugeicon(Alert02Icon)}<span>${words.coresWarning}</span></div>`,
  );

export const engineRowMarkup = (words: EngineWords): SafeHtml =>
  html`<div class="ln-ext-engine__row"><div class="ln-ext-engine__row-text"><b>${words.engine} ${modMarkup('engine')}</b><span data-ln-ext-bind="kindName"></span></div>${kindSwitchMarkup(words)}</div>${toastMarkup()}`;

export const coresRowMarkup = (words: EngineWords): SafeHtml =>
  html`<div class="ln-ext-engine__row"><div class="ln-ext-engine__row-text"><b>${words.cores} ${modMarkup('cores')}</b><span data-ln-ext-bind="suggested"></span></div>${stepperMarkup('cores', words)}</div>${warningMarkup(words)}`;

/** The device's cores as chips, those the analysis takes lit, the suggestion underlined. */
export const coreChipsMarkup = (): SafeHtml =>
  html`<div class="ln-ext-engine__cores">${Array.from(
    { length: deviceCores() },
    (_, i) =>
      html`<button type="button" class="ln-ext-engine__core" data-ln-ext-act="core:${i + 1}" data-ln-ext-core="${i + 1}" aria-label="${i + 1}">${hugeicon(CpuIcon)}</button>`,
  )}</div>`;

export const advancedMarkup = (words: EngineWords): SafeHtml =>
  html`<div class="ln-ext-engine__advanced">
    <button type="button" class="ln-ext-engine__disclosure" data-ln-ext-act="advanced" aria-expanded="false">${hugeicon(Settings02Icon)}<b>${words.advanced}</b>${bind('layout')}${hugeicon(ArrowDown01Icon, { className: 'ln-ext-engine__chevron' })}</button>
    <div class="ln-ext-engine__reveal" data-ln-ext-when="advanced" data-ln-ext-reveal="height" hidden><div class="ln-ext-engine__adv">
      <div class="ln-ext-engine__adv-row"><b>${words.threads} ${modMarkup('threads')}</b>${stepperMarkup('threads', words)}<p>${words.threadsWhy}</p></div>
      <div class="ln-ext-engine__adv-row"><b>${words.hash} ${modMarkup('hash')}</b><select data-ln-ext-input="hash" aria-label="${words.hash}">${HASHES.map(hash => html`<option value="${hash}">${words.megabytes(hash)}</option>`)}</select><p>${words.hashWhy}</p></div>
      <div class="ln-ext-engine__adv-row"><b>${words.cap} ${modMarkup('cap')}</b><span class="ln-ext-engine__chips">${CAPS.map(cap => html`<button type="button" data-ln-ext-act="cap:${cap}" data-ln-ext-cap="${cap}">${cap === 0 ? words.capNone : `${cap} s`}</button>`)}</span></div>
      <p class="ln-ext-engine__total" data-ln-ext-bind="total"></p>
    </div></div>
  </div>`;

const STATES = ['engine', 'cloud', 'busy'] as const;

/** The run going on: its level and time left, how far it is, and its grid of positions. */
const progressMarkup = (words: EngineWords): SafeHtml =>
  html`<div class="ln-ext-engine__run"><span><b>${bind('running')}</b>${bind('left')}</span><strong>${bind('percent')}<small>%</small></strong></div>
    <div class="ln-ext-engine__grid" data-ln-ext-grid aria-hidden="true"></div>
    <div class="ln-ext-engine__key">${STATES.map(state => html`<span><i data-ln-ext-state="${state}"></i>${words.states[state]}</span>`)}</div>`;

/** What the popover ends on: the re-analysis, or why there's none to make. */
export const footMarkup = (words: EngineWords): SafeHtml =>
  html`<div class="ln-ext-engine__foot ln-ext-engine__stack">
    <button type="button" class="ln-ext-engine__primary" data-ln-ext-act="reanalyse" data-ln-ext-when="raise" data-ln-ext-reveal="fade" hidden>${hugeicon(Refresh01Icon)}${bind('reanalyse')}<small>${bind('estimate')}</small></button>
    <p class="ln-ext-engine__done" data-ln-ext-when="same" data-ln-ext-reveal="fade" hidden>${hugeicon(Tick02Icon)}${words.upToDate}</p>
    <p class="ln-ext-engine__done" data-ln-ext-when="lower" data-ln-ext-reveal="fade" hidden>${hugeicon(Tick02Icon)}${words.keptDeeper}</p>
    <div class="ln-ext-engine__progress" data-ln-ext-when="running" data-ln-ext-reveal="fade" hidden>${progressMarkup(words)}${reveal('shift', html`<button type="button" class="ln-ext-engine__secondary" data-ln-ext-act="reanalyse">${hugeicon(Refresh01Icon)}${bind('shift')}<small>${bind('shiftEstimate')}</small></button>`)}</div>
  </div>`;

export const headIcon = (): SafeHtml => hugeicon(DashboardSpeed02Icon);
export const engineIcon = (): SafeHtml => hugeicon(AiChipIcon);
export const coresIcon = (): SafeHtml => hugeicon(CpuIcon);
