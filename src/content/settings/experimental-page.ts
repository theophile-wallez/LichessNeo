import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon';
import LinkSquare02Icon from '@hugeicons/core-free-icons/LinkSquare02Icon';
import { queryOne } from '#shared/dom.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { extensionUrl, message } from '#content/platform/runtime.ts';
import { buildSwitchList } from './switch-list.ts';

// The settings' Experimental page: features still being tried out, each a
// card with a switch, and under the Chess.com ratings the study they come
// from, unfolded in a frame.

const STUDY_URL = 'https://theophile-wallez.github.io/lichess-chesscom-ratings/';

// Lichess's CSP lets no other site in a frame, but the extension's pages: ours
// frames the study's. Lichess's COEP takes both frames credentialless.
const STUDY_FRAME = 'pages/rating-study.html';

const studyMarkup = (): SafeHtml =>
  html`<details class="ln-ext-study">
    <summary class="ln-ext-study__summary">
      <span class="ln-ext-setting__icon" aria-hidden="true"></span>
      <span class="ln-ext-setting__text">
        <span class="ln-ext-setting__title">${message('settingChesscomStudy')}</span>
        <span class="ln-ext-setting__body">${message('settingChesscomStudyBody')}</span>
      </span>
      <span class="ln-ext-study__chevron" aria-hidden="true">${hugeicon(ArrowDown01Icon)}</span>
    </summary>
    <div class="ln-ext-study__content">
      <iframe class="ln-ext-study__frame" credentialless title="${message('settingChesscomStudy')}"></iframe>
      <a class="ln-ext-study__link" href="${STUDY_URL}" target="_blank" rel="noopener">
        ${hugeicon(LinkSquare02Icon)}<span>${message('settingChesscomStudyOpen')}</span>
      </a>
    </div>
  </details>`;

/** The page's cards, kept in step with the settings; the study loads when first unfolded. */
export function buildExperimentalPage(): HTMLElement {
  const list = buildSwitchList(
    [
      {
        key: 'chesscomRating',
        title: message('settingChesscomRating'),
        body: message('settingChesscomRatingBody'),
      },
    ],
    studyMarkup(),
  );
  const study = queryOne(list, '.ln-ext-study', HTMLDetailsElement);
  study?.addEventListener('toggle', () => {
    const frame = queryOne(study, '.ln-ext-study__frame', HTMLIFrameElement);
    if (study.open && frame && !frame.getAttribute('src')) frame.src = extensionUrl(STUDY_FRAME);
  });
  return list;
}
