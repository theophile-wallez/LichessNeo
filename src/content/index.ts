import { startFeatures } from '#shared/features.ts';
import { assets } from './bootstrap/assets.ts';
import { packs } from './packs/index.ts';
import { fonts } from './bootstrap/fonts.ts';
import { donate } from './sidebar/donate.ts';
import { sidebarCollapse } from './sidebar/collapse.ts';
import { drawer } from './sidebar/drawer.ts';
import { currentSection } from './sidebar/current.ts';
import { accountRating } from './sidebar/account-rating.ts';
import { coachChoice } from './bootstrap/coach-choice.ts';
import { fideOffset } from './pages/fide.ts';
import { marks } from './layout/marks.ts';
import { hasFlags } from './layout/has-flags.ts';
import { aiPlayers } from './game/ai-players.ts';
import { boardZoom } from './layout/board-zoom.ts';
import { mainScroll } from './layout/main-scroll.ts';
import { controlsHeight } from './layout/controls-height.ts';
import { movesExtrasHeight } from './layout/moves-extras-height.ts';
import { analysisPlayers } from './analysis/players.ts';
import { underboard } from './analysis/underboard.ts';
import { activeMove } from './analysis/active-move.ts';
import { capturedPieces } from './game/captured.ts';
import { boardTools } from './game/board-tools.ts';
import { moveTimes } from './game/move-times.ts';
import { newGame } from './game/new-game.ts';
import { countryFlags } from './game/flags.ts';
import { gameIntro } from './game/intro/index.ts';
import { coachMessage } from './game/coach-message.ts';
import { boardInset } from './layout/board-inset.ts';
import { evalGauge } from './analysis/eval-gauge.ts';
import { puzzle } from './puzzle/index.ts';
import { extensionSettings } from './settings/index.ts';
import { homeHero } from './pages/home-hero.ts';
import { speedCards } from './pages/speed-cards/index.ts';
import { coachTitles } from './pages/coach-titles.ts';
import { swiss } from './pages/swiss.ts';
import { forumLabels } from './pages/forum.ts';
import { tv } from './pages/tv.ts';
import { practiceIcons } from './pages/practice-icons.ts';
import { gameMeta } from './game/game-meta.ts';
import { avatars } from './ui/avatars.ts';
import { powertip } from './ui/powertip.ts';
import { tooltip } from './ui/tooltip.ts';
import { tabs } from './ui/tabs.ts';
import { devReload } from './dev/reload.ts';
import { radar } from './charts/radar/index.ts';
import { ratingChart } from './charts/rating-chart/index.ts';
import { coach } from './coach/index.ts';
import { computer } from './computer/index.ts';
import { reloadIfInjectedLate } from './bootstrap/late-reload.ts';
import { startSyncLoop } from './sync-loop.ts';

// The isolated-world content script. It can reach the extension's files and
// APIs, not Lichess's objects (see src/page for those).

function main(): void {
  // Our mark, the picked packs and the account's rating go on <html> first, so the page never
  // shows Lichess's board, pieces or avatar in their place.
  startFeatures([assets, packs, accountRating]);
  if (reloadIfInjectedLate()) return;
  startFeatures([
    fonts,
    donate,
    sidebarCollapse,
    drawer,
    currentSection,
    coachChoice,
    fideOffset,
    marks,
    hasFlags,
    aiPlayers,
    boardZoom,
    mainScroll,
    controlsHeight,
    movesExtrasHeight,
    analysisPlayers,
    underboard,
    activeMove,
    capturedPieces,
    boardTools,
    moveTimes,
    newGame,
    countryFlags,
    gameIntro,
    coachMessage,
    boardInset,
    evalGauge,
    puzzle,
    extensionSettings,
    homeHero,
    speedCards,
    coachTitles,
    swiss,
    forumLabels,
    tv,
    practiceIcons,
    gameMeta,
    avatars,
    powertip,
    tooltip,
    tabs,
    devReload,
    radar,
    ratingChart,
    coach,
    computer,
  ]);
  startSyncLoop();
}

main();
