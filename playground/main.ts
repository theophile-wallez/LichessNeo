import { queryOne } from '#shared/dom.ts';
import { App } from './app.ts';
import { colorsPanel, whoPanel } from './look-panel.ts';
import { furPanel, skinPanel } from './skin-panel.ts';
import { clockPanel, entrancesPanel, moodPanel, reactionsPanel } from './motion-panel.ts';

// The mascots' playground, a page apart from the extension (pnpm playground):
// the coaches and the robot on a stage, with a panel to change their colors,
// their fur and their mood, and to make them move.

const stage = queryOne(document, '#stage', HTMLElement);
const panel = queryOne(document, '#panel', HTMLElement);
if (!stage || !panel) throw new Error('the playground page has no stage or panel');

const app = new App(stage);
const refreshes: (() => void)[] = [];
const refreshAll = (): void => {
  for (const refresh of refreshes) refresh();
};
whoPanel(panel, app, refreshAll);
moodPanel(panel, app);
reactionsPanel(panel, app);
entrancesPanel(panel, app);
refreshes.push(
  colorsPanel(panel, app, refreshAll),
  skinPanel(panel, app, refreshAll),
  furPanel(panel, app),
);
clockPanel(panel, app);
refreshAll();

stage.addEventListener('click', () => app.theater.poke());

// scripts/playground.ts says when it has rebuilt the page.
new EventSource('/events').addEventListener('reload', () => location.reload());
