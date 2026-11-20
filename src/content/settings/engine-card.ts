import { saveReviewEngine } from '#content/review-engine/index.ts';
import { isFrench } from '#shared/lang.ts';
import { EnginePanel } from '#shared/review-engine/panel.ts';
import { engineWords } from '#shared/review-engine/words.ts';
import { currentSettings, onSettings } from './settings.ts';

// The settings' Debrief engine card, on the Analysis page: the review's
// popover panel at full size (#shared/review-engine), the times given for a
// game of 40 moves.

const POSITIONS = 81;

export function buildEngineCard(): HTMLElement {
  const panel = new EnginePanel({
    page: true,
    words: engineWords(isFrench()),
    positions: POSITIONS,
    onChange: options => saveReviewEngine(options),
  });
  panel.show(currentSettings().reviewEngine, null, true);
  onSettings(settings => panel.show(settings.reviewEngine, null));
  return panel.element;
}
