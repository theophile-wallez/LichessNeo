// Which computed properties a picture of the board writes out (after
// distortion-waves' capture, MIT): every one that changes a still picture,
// each by its physical name only.

/** Properties that change nothing in a still picture. */
const STILL =
  /^(?:animation|transition|view-timeline|scroll-timeline|timeline-scope|view-transition|scroll-|overscroll-behavior|anchor-|position-anchor|position-area|position-try|position-visibility|cursor$|pointer-events$|user-select$|-webkit-user-|-moz-user-|touch-action$|will-change$|resize$|caret-|interactivity$|app-region$|-webkit-app-region$|-webkit-tap-highlight|orphans$|widows$|page|break-|speak|interpolate-size$|field-sizing$|reading-flow$|reading-order$|-moz-window|-moz-force-broken|-moz-context-properties$|-moz-orient$|-webkit-line-grid|-webkit-nbsp-mode|-webkit-cursor|-webkit-touch-callout)/;

/** The flow-relative names of properties also listed by their physical ones. */
const LOGICAL = /(?:^|-)(?:block|inline)(?:-|$)|^border-(?:start|end)-(?:start|end)-radius$/;

/** Whether the picture writes `name`. */
export const isWritten = (name: string): boolean =>
  !name.startsWith('--') && !STILL.test(name) && !LOGICAL.test(name);

/** Properties a child takes from its parent. */
export const INHERITED: ReadonlySet<string> = new Set(
  [
    'border-collapse border-spacing caption-side color color-scheme direction empty-cells',
    'font-family font-feature-settings font-kerning font-language-override font-optical-sizing',
    'font-palette font-size font-size-adjust font-stretch font-width font-style',
    'font-synthesis-weight font-synthesis-style font-synthesis-small-caps font-synthesis-position',
    'font-variant-alternates font-variant-caps font-variant-east-asian font-variant-emoji',
    'font-variant-ligatures font-variant-numeric font-variant-position font-variation-settings',
    'font-weight forced-color-adjust hanging-punctuation hyphenate-character hyphenate-limit-chars',
    'hyphens image-orientation image-rendering letter-spacing line-break line-height',
    'list-style-image list-style-position list-style-type math-depth math-shift math-style',
    'overflow-wrap paint-order print-color-adjust quotes ruby-align ruby-position tab-size',
    'text-align text-align-last text-anchor text-autospace text-combine-upright',
    'text-decoration-skip-ink text-emphasis-color text-emphasis-position text-emphasis-style',
    'text-indent text-justify text-orientation text-rendering text-shadow text-size-adjust',
    'text-spacing-trim text-transform text-underline-offset text-underline-position text-wrap-mode',
    'text-wrap-style text-wrap white-space-collapse white-space visibility word-break word-spacing',
    'writing-mode fill fill-opacity fill-rule stroke stroke-dasharray stroke-dashoffset',
    'stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width clip-rule',
    'color-interpolation color-interpolation-filters color-rendering shape-rendering marker-start',
    'marker-mid marker-end -webkit-font-smoothing -moz-osx-font-smoothing -webkit-text-fill-color',
    '-webkit-text-stroke-color -webkit-text-stroke-width -webkit-text-security -webkit-locale',
    '-webkit-rtl-ordering -webkit-text-orientation -webkit-writing-mode -webkit-line-break',
    '-webkit-border-horizontal-spacing -webkit-border-vertical-spacing -webkit-print-color-adjust',
    '-webkit-text-decorations-in-effect -webkit-text-size-adjust -webkit-hyphenate-character',
    '-webkit-text-emphasis-color -webkit-text-emphasis-position -webkit-text-emphasis-style',
    '-webkit-text-combine -webkit-ruby-position -webkit-text-zoom -webkit-box-direction',
    '-webkit-user-modify -moz-text-size-adjust -moz-tab-size -moz-box-direction -webkit-hyphens',
    '-webkit-text-underline-position -webkit-font-kerning -webkit-font-feature-settings',
  ]
    .join(' ')
    .split(' '),
);

/** Properties that follow the text's colour unless told otherwise. */
export const FOLLOWS_COLOR: ReadonlySet<string> = new Set([
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'column-rule-color',
  '-webkit-text-decoration-color',
]);

/** Elements a picture leaves out, with all they hold. */
export const LEFT_OUT: ReadonlySet<string> = new Set([
  'script',
  'style',
  'noscript',
  'template',
  'link',
  'meta',
  'title',
  'head',
  'base',
  'source',
  'track',
  'param',
  'datalist',
  'iframe',
  'object',
  'embed',
  'audio',
  'video',
]);

export const VOID_TAGS: ReadonlySet<string> = new Set([
  'area',
  'br',
  'col',
  'hr',
  'img',
  'input',
  'wbr',
]);
