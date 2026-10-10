import { startFeatures } from '#shared/features.ts';
import { assets } from './bootstrap/assets.ts';
import { packs } from './packs/index.ts';
import { colorThemes } from './colors/index.ts';
import { fonts } from './bootstrap/fonts.ts';
import { donate } from './sidebar/donate.ts';
import { sidebarCollapse } from './sidebar/collapse.ts';
import { drawer } from './sidebar/drawer.ts';
import { preferencesButton } from './sidebar/preferences-button.ts';
import { schemeToggle } from './sidebar/scheme-toggle.ts';
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
import { ratingRefresh } from './game/rating-refresh.ts';
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
import { simulScores } from './pages/simul-scores.ts';
import { editorTools } from './pages/editor-tools.ts';
import { forumLabels } from './pages/forum.ts';
import { tv } from './pages/tv.ts';
import { practiceIcons } from './pages/practice-icons.ts';
import { streamerSections } from './pages/streamer-sections.ts';
import { racerHome } from './pages/racer-home.ts';
import { videoCountPill } from './pages/video-count.ts';
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
  // Our mark, the picked packs and color themes, and the account's rating go on <html> first, so
  // the page never shows Lichess's board, pieces, colors or avatar in their place.
  startFeatures([assets, packs, colorThemes, accountRating]);
  if (reloadIfInjectedLate()) return;
  startFeatures([
    fonts,
    donate,
    sidebarCollapse,
    drawer,
    schemeToggle,
    preferencesButton,
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
    ratingRefresh,
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
    simulScores,
    editorTools,
    forumLabels,
    tv,
    practiceIcons,
    streamerSections,
    racerHome,
    videoCountPill,
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
