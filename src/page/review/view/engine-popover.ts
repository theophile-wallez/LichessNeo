import { closestTo, createElement } from '#shared/dom.ts';
import { isFrench } from '#shared/lang.ts';
import { EnginePanel } from '#shared/review-engine/panel.ts';
import { engineWords } from '#shared/review-engine/words.ts';
import { isOpen, togglePopup } from '#shared/ui-motion.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import {
  onReviewEngineChange,
  pickReviewEngine,
  reviewEngine,
} from '#page/review/engine/review-engine.ts';
import { reanalyse } from '#page/review/game/reanalyse.ts';
import type { Session } from '#page/review/session.ts';
import { statesOf, statusOf } from './engine-status.ts';
import { syncEngineButton } from './graph-buttons.ts';
import { hideTip } from './tooltip.ts';

// The Debrief's engine settings, in a popover under the graph's engine button
// (graph-buttons.ts): the settings' own panel (#shared/review-engine), with
// where this game stands and a re-analysis when the settings ask for more
// than it has. It hangs from the tabs, over the panel, which scrolls and
// would clip it.

interface Popover {
  readonly element: HTMLElement;
  readonly panel: EnginePanel;
  key: string;
}

const popovers = new WeakMap<Session, Popover>();

// Room kept between the button and the popover, and under the popover.
const GAP = 6;
const ROOM_BELOW = 12;

/** Hangs the popover under the graph's engine button, wherever the graph has it. */
function anchor({ element }: Popover, { elements }: Session): void {
  const button = elements.graphEngine;
  if (!button.isConnected) return;
  const bar = elements.modes.getBoundingClientRect();
  const from = button.getBoundingClientRect();
  const top = from.bottom - bar.top + GAP;
  element.style.setProperty('--ln-ext-engine-top', `${Math.round(top)}px`);
  element.style.setProperty('--ln-ext-engine-right', `${Math.round(bar.right - from.right)}px`);
  element.style.setProperty('--ln-ext-engine-origin', `${Math.round(from.width / 2)}px`);
  const room = window.innerHeight - from.bottom - GAP - ROOM_BELOW;
  element.style.setProperty('--ln-ext-engine-room', `${Math.round(room)}px`);
}

function close(session: Session): void {
  if (!session.view.engine) return;
  session.view.engine = false;
  session.redraw(true);
}

function build(session: Session, analysis: Analysis): Popover {
  const panel = new EnginePanel({
    page: false,
    words: engineWords(isFrench()),
    positions: session.work.nodes.length,
    onChange: pickReviewEngine,
    onReanalyse: () => void reanalyse(session, analysis),
  });
  const element = createElement('div', { className: 'ln-ext-review-engine' });
  element.hidden = true;
  element.append(panel.element);
  session.elements.modes.append(element);
  const popover: Popover = { element, panel, key: '' };
  // The settings may change in the extension's own page meanwhile.
  onReviewEngineChange(() => {
    popover.key = '';
    syncEngineButton(session);
  });
  document.addEventListener('pointerdown', event => {
    const target = event.target;
    if (!(target instanceof Node) || element.contains(target)) return;
    if (closestTo(target, '[data-ln-ext="engine"]', Element)) return;
    close(session);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') close(session);
  });
  return popover;
}

/** Opens or closes the popover as the view says, and keeps it to the game's progress. */
export function syncEnginePopover(session: Session, analysis: Analysis): void {
  const open = session.view.engine;
  syncEngineButton(session);
  const popover = popovers.get(session) ?? (open ? build(session, analysis) : null);
  if (!popover) return;
  popovers.set(session, popover);
  // Opened again as it closes, too.
  const opening = open && !isOpen(popover.element);
  if (open) {
    if (opening) {
      anchor(popover, session);
      if (session.tipFor === session.elements.graphEngine) hideTip(session);
    }
    const settings = reviewEngine();
    const status = statusOf(session);
    const key = JSON.stringify([settings, status]);
    if (key !== popover.key) {
      popover.key = key;
      popover.panel.show(settings, status, opening);
    }
    if (status.running) popover.panel.fill(statesOf(session));
  }
  if (open !== isOpen(popover.element)) togglePopup(popover.element, open);
}
