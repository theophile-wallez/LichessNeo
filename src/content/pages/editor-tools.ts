import { queryAll, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The board editor's tools are icons (styles/editor/panel.css): each one's label goes to our
// tooltip (content/ui/tooltip.ts), with its shortcut when Lichess's title gives one
// ("Hotkey: a"). Snabbdom redraws the panel on every change, hence every tick.

const TOOLS =
  'main .board-editor__tools .actions > :is(button, a), main .board-editor__tools .actions > form > button';

/** The tooltip for a tool: its label, then its key in parentheses, as `splitShortcut` reads it. */
export function toolTip(label: string, title: string): string {
  const key = /:\s*(\S)$/.exec(title)?.[1];
  return key ? `${label} (${key})` : label;
}

export function syncEditorTools(): void {
  for (const tool of queryAll(document, TOOLS, HTMLElement)) {
    const label = tool.textContent.trim();
    // Done already: the title, once read, is gone (the tooltip would take it over ours).
    if (!label || (tool.dataset.lrExtTip && !tool.title)) continue;
    setData(tool, 'lrExtTip', toolTip(label, tool.title));
    tool.removeAttribute('title');
    if (tool.getAttribute('aria-label') !== label) tool.setAttribute('aria-label', label);
  }
}

export const editorTools: Feature = {
  name: 'editor tools',
  start: () => onEveryTick('editor tools', syncEditorTools),
};
