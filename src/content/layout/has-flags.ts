import { closestTo, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { oncePerFrame } from '#shared/frame.ts';

// What the page holds, one word each in `data-lr-ext-has` on <html>, for the rules
// that would otherwise use `html:has(main.round)` or `main.analyse:has(.mchat)`.
// <html> and <main> hold the board, and Chrome checked a `:has()` on them again
// on every move, restyling everything the rule styles.

const CLOCK_EXTRAS = ':is(.berserked, .go-berserk, .moretime, .tour-rank, .rclock-turn__text)';

const FLAGS: Readonly<Record<string, string>> = {
  round: 'main.round',
  'round-chat': 'main.round .mchat',
  'tv-channels': 'main.round.tv-single > .round__side > .subnav',
  pocket: 'main.round .pocket',
  'round-voice': 'main.round #voice-bar',
  'round-crosstable': 'main.round .round__underboard > .crosstable',
  'clock-extras-top': `main.round .rclock-top > ${CLOCK_EXTRAS}`,
  'clock-extras-bottom': `main.round .rclock-bottom > ${CLOCK_EXTRAS}`,
  analyse: 'main.analyse',
  'analyse-chat': 'main.analyse > .mchat',
  'analyse-players': 'main.analyse > .lr-ext-player',
  'analyse-clock': 'main.analyse .analyse__clock',
  'analyse-white': 'main.analyse .analyse__board > .orientation-white',
  'analyse-black': 'main.analyse .analyse__board > .orientation-black',
  'round-black': 'main.round .round__app__board > .orientation-black',
  'relay-tour': 'main.analyse.has-relay-tour',
  'study-side': 'main.analyse > .analyse__side > .study__side',
  practice: 'main.analyse .practice__side',
  'practice-box': 'main.analyse .practice-box',
  'keyboard-move': 'main.analyse .keyboard-move',
  'analyse-training': 'main.analyse > .analyse__round-training > *',
  puzzle: 'main.puzzle',
  'puzzle-keyboard': 'main.puzzle > .keyboard-move',
  'puzzle-session': 'main.puzzle > .puzzle__session',
  storm: 'main > .storm',
  'storm-play': 'main > .storm--play',
  swiss: 'main.swiss',
  lobby: 'main.lobby',
  'coach-list': 'main.coach-list',
  'team-list': 'main.team-list',
  'user-show': 'main.page-menu .user-show',
  'perf-stat': 'main.page-menu > .perf-stat',
  'puzzle-themes': 'main.page-menu .puzzle-themes',
  'tournament-calendar': 'main.box > #tournament-calendar',
  // The leagues' page is one of Lichess's plain pages: told by its first section.
  'leagues-page': 'main.page #lichess-streamer-battles',
};

/** The words for what `root` holds, space-separated. */
export function presentFlags(root: ParentNode): string {
  return Object.entries(FLAGS)
    .filter(([, selector]) => root.querySelector(selector))
    .map(([flag]) => flag)
    .join(' ');
}

export function syncHasFlags(): void {
  setData(document.documentElement, 'lrExtHas', presentFlags(document));
}

// The pieces and the clock's digits change all the time and hold none of the
// flags, so a change there alone isn't worth a check.
const isBoardOrClock = (record: MutationRecord): boolean =>
  closestTo(record.target, 'cg-container, .time', Element) !== null;

export const hasFlags: Feature = {
  name: 'has flags',
  start: () => {
    // Before the next frame, so a rule never shows the page without its flag.
    const syncSoon = oncePerFrame(syncHasFlags);
    new MutationObserver(records => {
      if (!records.every(isBoardOrClock)) syncSoon();
    }).observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    syncHasFlags();
  },
};
