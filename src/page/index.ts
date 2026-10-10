import { startFeatures } from '#shared/features.ts';
import { motion } from './motion/index.ts';
import { sounds } from './sounds/index.ts';
import { labels } from './labels/labels.ts';
import { shapes } from './board/index.ts';
import { review } from './review/index.ts';
import { distribution } from './charts/distribution/index.ts';
import { gameCharts } from './charts/game/index.ts';
import { gameOver } from './game-over/index.ts';
import { chat } from './chat/index.ts';
import { nextGameSeek } from './seek/index.ts';

// The page-world script: it runs in Lichess's own JavaScript context, so it
// can reach `site`, the analysis controller and the sound player, but not
// the extension's APIs (see src/content for those).

startFeatures([
  motion,
  sounds,
  labels,
  shapes,
  review,
  distribution,
  gameCharts,
  gameOver,
  chat,
  nextGameSeek,
]);
