import { closestTo, isParsing, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { oncePerFrame } from '#shared/frame.ts';

// What the page holds, one word each in `data-ln-ext-has` on <html>, for the rules
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
  // The game over's card (page/game-over), which says the result Zen's column has no room for.
  'round-end-card': 'main.round .rcontrols .ln-ext-end__card',
  // A game with no clock, whose clocks' room Zen gives to its column. Lichess draws an empty
  // .rclock-turn in their place while it's played, and nothing once it's over.
  'round-clockless': 'main.round:not(:has(.rclock:not(.rclock-turn)))',
  'clock-extras-top': `main.round .rclock-top > ${CLOCK_EXTRAS}`,
  'clock-extras-bottom': `main.round .rclock-bottom > ${CLOCK_EXTRAS}`,
  analyse: 'main.analyse',
  'analyse-chat': 'main.analyse > .mchat',
  // A game's analysis, told from Lichess's own game info, which it serves with the page: the
  // player bars' room is then reserved on the first paint, rather than once our bars are in
  // (`analyse-players`) and the board has been drawn 112px too tall.
  'analyse-game': 'main.analyse .game__meta__players',
  'analyse-players': 'main.analyse > .ln-ext-player',
  'analyse-clock': 'main.analyse .analyse__clock',
  'analyse-captured': 'main.analyse > .ln-ext-captured',
  'analyse-white': 'main.analyse .analyse__board > .orientation-white',
  'analyse-black': 'main.analyse .analyse__board > .orientation-black',
  'round-black': 'main.round .round__app__board > .orientation-black',
  // Lichess's "clock on the left", a touch device's setting, in its one-column layout.
  'round-swap-clock': 'main.round .round__app.swap-clock',
  'relay-tour': 'main.analyse.has-relay-tour',
  // A broadcast picker's click-away mask, kept in <body>: Lichess points it at the open one.
  'menu-mask': 'body > .mselect__fullscreen-mask[for]',
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
  tour: 'main.tour',
  simul: 'main.simul',
  'board-editor': 'main > .board-editor',
  lobby: 'main.lobby',
  'coach-list': 'main.coach-list',
  'team-list': 'main.team-list',
  'user-show': 'main.page-menu .user-show',
  account: 'main.account:not(.dgt)',
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
  setData(document.documentElement, 'lnExtHas', presentFlags(document));
}

// The pieces and the clock's digits change all the time and hold none of the
// flags, so a change there alone isn't worth a check.
const isBoardOrClock = (record: MutationRecord): boolean =>
  closestTo(record.target, 'cg-container, .time', Element) !== null;

export const hasFlags: Feature = {
  name: 'has flags',
  start: () => {
    // Before the next frame, so a rule never shows the page without its flag. While the page
    // parses, at once instead: a frame later is a frame of the page laid out without its
    // flags, and the lookups are affordable on the parser's handful of chunks, where they
    // wouldn't be on a board's mutations.
    const syncSoon = oncePerFrame(syncHasFlags);
    new MutationObserver(records => {
      if (records.every(isBoardOrClock)) return;
      if (isParsing()) syncHasFlags();
      else syncSoon();
    }).observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'for'],
    });
    syncHasFlags();
  },
};
