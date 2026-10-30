import { queryAll, queryOne } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { DemoCoach } from './coach.ts';
import { endCardMarkup, lichessToolsMarkup } from './lichess-panel.ts';
import { showPanel } from './motion/panel.ts';
import { SlidingPill } from './motion/pill.ts';

// The panel's three tabs, as the review's (page/review/view/mode-tabs.ts): the
// summary, the move-by-move debrief and Lichess's own panel. The tab picked
// carries a pill that slides to the next one picked (motion/pill.ts);
// each mode shows its own parts of the panel (demo-modes.css).

export type Mode = 'summary' | 'moves' | 'normal';

const MODES: ReadonlySet<string> = new Set<Mode>(['summary', 'moves', 'normal']);

export const isMode = (value: string | undefined): value is Mode =>
  value !== undefined && MODES.has(value);

export class PanelModes {
  readonly #panel: HTMLElement;
  readonly #pill: SlidingPill | null;
  #coach: number;
  // Lichess's panel, drawn the first time it's opened, with its own live coach.
  #endCoach: DemoCoach | null = null;

  constructor(panel: HTMLElement, coach: number) {
    this.#panel = panel;
    this.#coach = coach;
    const tabs = queryOne(panel, '.demo-tabs', HTMLElement);
    this.#pill = tabs && new SlidingPill(tabs, '[aria-selected=true]');
  }

  get mode(): Mode {
    const { mode } = this.#panel.dataset;
    return isMode(mode) ? mode : 'moves';
  }

  set(mode: Mode): void {
    const changed = this.#panel.dataset.mode !== mode;
    this.#panel.dataset.mode = mode;
    for (const tab of queryAll(this.#panel, '[role=tab]', HTMLElement))
      tab.setAttribute('aria-selected', String(tab.dataset.mode === mode));
    this.#pill?.follow();
    if (mode === 'normal') this.#drawLichess();
    if (changed) showPanel(this.#panel);
  }

  #drawLichess(): void {
    if (this.#endCoach) return;
    const tools = queryOne(this.#panel, '.demo-lichess__tools', HTMLElement);
    const end = queryOne(this.#panel, '.demo-end', HTMLElement);
    if (tools) setHtml(tools, lichessToolsMarkup());
    if (!end) return;
    setHtml(end, endCardMarkup(this.#coach));
    const avatar = queryOne(end, '.ln-ext-coach__avatar', HTMLElement);
    if (!avatar) return;
    avatar.replaceChildren();
    this.#endCoach = new DemoCoach(avatar, this.#coach);
    this.#endCoach.mount().catch(() => undefined);
  }

  setCoach(coach: number): void {
    this.#coach = coach;
    this.#endCoach?.setCoach(coach);
  }
}
