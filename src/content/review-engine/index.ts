import type { Feature } from '#shared/features.ts';
import { onReviewEnginePick, postReviewEngine } from '#shared/protocol.ts';
import {
  keepReviewEngine,
  keptReviewEngine,
  type ReviewEngine,
} from '#shared/review-engine/options.ts';
import { onSettings, saveSetting } from '#content/settings/settings.ts';

// The Debrief's engine settings, between the extension's settings and the page
// world: kept where the page reads them as it starts, told to it as they
// change, and saved when its popover or the settings' card picks them.

// chrome.storage.sync takes 120 writes a minute: a dragged depth is saved once it rests.
const SAVE_DELAY_MS = 400;

let told = '';
let timer = 0;
// A pick not saved yet: the settings' echo of an earlier one would undo it.
let saving = false;
// Picks so far: a save that ends after a later pick leaves it waiting.
let picks = 0;

function tell(options: ReviewEngine): void {
  const key = JSON.stringify(options);
  if (key === told) return;
  told = key;
  keepReviewEngine(options);
  postReviewEngine(options);
}

/** Saves a pick, once the user stops changing it; the page hears of it at once. */
export function saveReviewEngine(options: ReviewEngine, page = true): void {
  if (page) tell(options);
  else {
    told = JSON.stringify(options);
    keepReviewEngine(options);
  }
  clearTimeout(timer);
  saving = true;
  const pick = ++picks;
  timer = window.setTimeout(() => {
    void saveSetting('reviewEngine', options).finally(() => {
      if (pick === picks) saving = false;
    });
  }, SAVE_DELAY_MS);
}

export const reviewEngine: Feature = {
  name: 'review-engine',
  start: () => {
    told = JSON.stringify(keptReviewEngine());
    onSettings(settings => {
      if (!saving) tell(settings.reviewEngine);
    });
    // The page has it already.
    onReviewEnginePick(options => saveReviewEngine(options, false));
  },
};
