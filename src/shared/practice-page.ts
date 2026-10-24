// The extension's page of opening practice: the free analysis board under a
// hash of ours (page/review/view/openings-page.ts), which the sidebar and the
// openings' pages link to.
import { DEV_BUILD } from './build-mode.ts';

export const PRACTICE_HASH = '#ln-ext-practice';

export const PRACTICE_URL = `/analysis${PRACTICE_HASH}`;

/** Whether the sidebar and the openings' pages link to it: dev builds only, until it's finished. */
export const PRACTICE_LINKED: boolean = DEV_BUILD;
