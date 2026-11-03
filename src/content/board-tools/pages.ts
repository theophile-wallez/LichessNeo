import { queryOne } from '#shared/dom.ts';

// The pages that get board tools, and how each reaches Lichess's menu: the
// game page's board menu opens on its `h` key, the analysis menu only from
// its button in the controls, which the stylesheets hide behind our cog.
// Lichess's controls act on a pointer's press and release, not on a click.

export type ToolName = 'menu' | 'flip' | 'zen';

export interface BoardPage {
  readonly main: string;
  /** Where the pointer shows the flip button. */
  readonly board: string;
  readonly tools: readonly ToolName[];
  /** Lichess's menu button, whose label and state the cog takes. */
  readonly menuToggle: string;
  /** Lichess's menu, once open: the analysis one is closed by us on a press elsewhere. */
  readonly menu?: string;
  readonly toggleMenu: (main: HTMLElement) => void;
}

export function pressKey(target: EventTarget, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keypress', { key, bubbles: true }));
}

export const ROUND: BoardPage = {
  main: 'main.round',
  board: '.round__app__board',
  tools: ['menu', 'flip', 'zen'],
  menuToggle: '.board-menu-toggle-btn',
  toggleMenu: main => pressKey(main, 'h'),
};

export const ANALYSIS: BoardPage = {
  main: 'main.analyse',
  board: '.analyse__board',
  tools: ['menu', 'flip'],
  menuToggle: '.analyse__controls > .fbt[data-act="menu"]',
  menu: '.analyse__tools > .action-menu',
  toggleMenu: main => {
    const toggle = queryOne(main, ANALYSIS.menuToggle, HTMLElement);
    for (const type of ['pointerdown', 'pointerup'])
      toggle?.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true }));
  },
};
