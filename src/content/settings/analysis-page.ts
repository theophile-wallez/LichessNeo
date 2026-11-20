import { isFrench } from '#shared/lang.ts';
import { engineWords } from '#shared/review-engine/words.ts';
import { message } from '#content/platform/runtime.ts';
import { buildClassStyleRow } from './class-style-row.ts';
import { buildDrawingsCard } from './drawings-card.ts';
import { buildEngineCard } from './engine-card.ts';
import { groupTitle } from './group-title.ts';
import { buildSwitchList } from './switch-list.ts';

// The settings' Analysis page: the engine the Debrief analyses with, then the
// Game Review's badges, the rating each side played at, and the coach's
// drawings, all, none or some (drawings-card.ts), then the coach on the free
// analysis board.

export const buildAnalysisPage = (): readonly HTMLElement[] => [
  groupTitle(engineWords(isFrench()).group),
  buildEngineCard(),
  groupTitle(message('settingsGroupReview')),
  buildClassStyleRow(),
  buildSwitchList([
    {
      key: 'reviewRating',
      title: message('settingReviewRating'),
      body: message('settingReviewRatingBody'),
    },
  ]),
  buildDrawingsCard(),
  groupTitle(message('settingsGroupAnalysisBoard')),
  buildSwitchList([
    {
      key: 'analysisCoach',
      title: message('settingAnalysisCoach'),
      body: message('settingAnalysisCoachBody'),
    },
  ]),
];
