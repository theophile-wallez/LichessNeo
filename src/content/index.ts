import { startFeatures } from '#shared/features.ts';
import { assets } from './bootstrap/assets.ts';
import { packs } from './packs/index.ts';
import { colorThemes } from './colors/index.ts';
import { fonts } from './bootstrap/fonts.ts';
import { donate } from './sidebar/donate.ts';
import { navigation } from './sidebar/navigation.ts';
import { openingsLink } from './sidebar/openings-link.ts';
import { sidebarCollapse } from './sidebar/collapse.ts';
import { drawer } from './sidebar/drawer.ts';
import { sidebarSections } from './sidebar/sections.ts';
import { lobbyLink } from './sidebar/lobby-link.ts';
import { preferencesButton } from './sidebar/preferences-button.ts';
import { schemeToggle } from './sidebar/scheme-toggle.ts';
import { currentSection } from './sidebar/current.ts';
import { accountRating } from './sidebar/account-rating.ts';
import { commandPalette } from './command-palette/index.ts';
import { coachChoice } from './bootstrap/coach-choice.ts';
import { fideOffset } from './pages/fide.ts';
import { marks } from './layout/marks.ts';
import { hasFlags } from './layout/has-flags.ts';
import { lichessPrefs } from './layout/lichess-prefs.ts';
import { aiPlayers } from './game/ai-players.ts';
import { boardZoom } from './layout/board-zoom.ts';
import { mainScroll } from './layout/main-scroll.ts';
import { controlsHeight } from './layout/controls-height.ts';
import { movesExtrasHeight } from './layout/moves-extras-height.ts';
import { panelTabs } from './layout/panel-tabs.ts';
import { analysisPlayers } from './analysis/players.ts';
import { underboard } from './analysis/underboard.ts';
import { activeMove } from './analysis/active-move.ts';
import { variations } from './analysis/variations.ts';
import { capturedPieces } from './game/captured.ts';
import { ratingStakes } from './game/stakes/index.ts';
import { boardTools } from './game/board-tools.ts';

import { moveTimes } from './game/move-times.ts';
import { newGame } from './game/new-game.ts';
import { zenExit } from './game/zen-exit.ts';
import { ratingRefresh } from './game/rating-refresh.ts';
import { countryFlags } from './game/flags.ts';
import { gameIntro } from './game/intro/index.ts';
import { coachMessage } from './game/coach-message.ts';
import { boardInset } from './layout/board-inset.ts';
import { evalGauge } from './analysis/eval-gauge.ts';
import { engineSettings } from './analysis/engine-settings.ts';
import { puzzle } from './puzzle/index.ts';
import { learnCoach } from './learn/coach.ts';
import { practiceAutoNext } from './practice/auto-next.ts';
import { practiceCoach } from './practice/coach.ts';
import { practiceSteps } from './practice/steps.ts';
import { studyChapterBar } from './study/chapter-bar.ts';
import { studyHead } from './study/head.ts';
import { extensionSettings } from './settings/index.ts';
import { clockBar } from './clock-bar/index.ts';
import { homeHero } from './pages/home-hero.ts';
import { speedCards } from './pages/speed-cards/index.ts';
import { coachTitles } from './pages/coach-titles.ts';
import { swiss } from './pages/swiss.ts';
import { podium } from './pages/podium.ts';
import { simulScores } from './pages/simul-scores.ts';
import { simulForm } from './simul-form/index.ts';
import { editorTools } from './pages/editor-tools.ts';
import { forumLabels } from './pages/forum.ts';
import { tv } from './pages/tv.ts';
import { practiceIcons } from './pages/practice-icons.ts';
import { streamerSections } from './pages/streamer-sections.ts';
import { racerHome } from './pages/racer-home.ts';
import { videoCountPill } from './pages/video-count.ts';
import { studyCards } from './pages/study-cards.ts';
import { openingPractice } from './pages/opening-practice.ts';
import { openings } from './pages/openings.ts';
import { gameMeta } from './game/game-meta.ts';
import { avatars } from './ui/avatars.ts';
import { ownNameFeature } from './ui/own-name.ts';
import { profileMedals } from './profile/medals.ts';
import { profileRecentGames } from './profile/recent-games/index.ts';
import { profileAvatarLink } from './profile/avatar-link.ts';
import { profileTrophies } from './profile/trophies.ts';
import { perfStat } from './profile/perf-stat/index.ts';
import { chesscomRatings } from './chesscom-ratings/index.ts';
import { playerCard } from './player-card/index.ts';
import { powertip } from './ui/powertip.ts';
import { tooltip } from './ui/tooltip.ts';
import { copyFields } from './ui/copy-fields.ts';
import { menus } from './ui/menus.ts';
import { tabs } from './ui/tabs.ts';
import { notices } from './notices/index.ts';
import { devReload } from './dev/reload.ts';
import { previewName } from './dev/preview-name.ts';
import { radar } from './charts/radar/index.ts';
import { puzzleDashboard } from './puzzle-dashboard/index.ts';
import { puzzleHistory } from './puzzle-dashboard/history/index.ts';
import { ratingChart } from './charts/rating-chart/index.ts';
import { coach } from './coach/index.ts';
import { coachPicker } from './coach/picker.ts';
import { computer } from './computer/index.ts';
import { gameSetup } from './game-setup/index.ts';
import { reloadIfInjectedLate } from './bootstrap/late-reload.ts';
import { startSyncLoop } from './sync-loop.ts';

// The isolated-world content script. It can reach the extension's files and
// APIs, not Lichess's objects (see src/page for those).

// The rest, in start order: a feature can rely on those before it.
const FEATURES = [
  fonts,
  donate,
  navigation,
  openingsLink,
  sidebarCollapse,
  drawer,
  sidebarSections,
  lobbyLink,
  schemeToggle,
  preferencesButton,
  commandPalette,
  currentSection,
  coachChoice,
  fideOffset,
  marks,
  hasFlags,
  lichessPrefs,
  clockBar,
  aiPlayers,
  boardZoom,
  mainScroll,
  controlsHeight,
  movesExtrasHeight,
  panelTabs,
  analysisPlayers,
  chesscomRatings,
  underboard,
  activeMove,
  variations,
  capturedPieces,
  ratingStakes,
  boardTools,
  zenExit,
  moveTimes,
  newGame,
  ratingRefresh,
  countryFlags,
  gameIntro,
  coachMessage,
  boardInset,
  evalGauge,
  engineSettings,
  puzzle,
  learnCoach,
  practiceCoach,
  practiceSteps,
  practiceAutoNext,
  studyChapterBar,
  studyHead,
  extensionSettings,
  homeHero,
  speedCards,
  coachTitles,
  swiss,
  podium,
  simulScores,
  simulForm,
  editorTools,
  forumLabels,
  tv,
  practiceIcons,
  streamerSections,
  racerHome,
  videoCountPill,
  studyCards,
  openings,
  openingPractice,
  gameMeta,
  avatars,
  ownNameFeature,
  profileMedals,
  profileRecentGames,
  profileAvatarLink,
  profileTrophies,
  perfStat,
  playerCard,
  powertip,
  tooltip,
  copyFields,
  menus,
  tabs,
  notices,
  devReload,
  previewName,
  radar,
  puzzleDashboard,
  puzzleHistory,
  ratingChart,
  coach,
  coachPicker,
  computer,
  gameSetup,
] as const;

function main(): void {
  // Our mark, the picked packs and color themes, and the account's rating go on <html> first, so
  // the page never shows Lichess's board, pieces, colors or avatar in their place.
  startFeatures([assets, packs, colorThemes, accountRating]);
  if (reloadIfInjectedLate()) return;
  startFeatures(FEATURES);
  startSyncLoop();
}

main();
