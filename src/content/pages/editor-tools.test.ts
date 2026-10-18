import { afterEach, describe, expect, it } from 'vitest';
import { syncEditorTools, toolTip } from './editor-tools.ts';

// The board editor's tools as Lichess draws them (lila's ui/editor view.ts).
const TOOLS = `<main><div class="board-editor"><div class="board-editor__tools"><div class="actions">
  <button class="button button-empty text" data-icon="">Starting position</button>
  <a class="button button-empty text" data-icon="" title="Hotkey: a" href="/analysis">Analysis board</a>
  <button class="button button-empty"><span class="text" data-icon="">Continue from here</span></button>
  <form method="post" action="/study/as"><button class="button button-empty text" type="submit" data-icon="">Study</button></form>
</div></div></div></main>`;

const tips = (): (string | undefined)[][] =>
  [...document.querySelectorAll<HTMLElement>('[data-ln-ext-tip]')].map(tool => [
    tool.dataset['lnExtTip'],
    tool.getAttribute('aria-label') ?? undefined,
    tool.getAttribute('title') ?? undefined,
  ]);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the board editor’s tools', () => {
  it('reads a shortcut from Lichess’s title', () => {
    expect(toolTip('Analysis board', 'Hotkey: a')).toBe('Analysis board (a)');
    expect(toolTip('Study', '')).toBe('Study');
    expect(toolTip('Study', 'A longer title')).toBe('Study');
  });

  it('names each tool for the tooltip, its title out of the way', () => {
    document.body.innerHTML = TOOLS;
    syncEditorTools();
    expect(tips()).toEqual([
      ['Starting position', 'Starting position', undefined],
      ['Analysis board (a)', 'Analysis board', undefined],
      ['Continue from here', 'Continue from here', undefined],
      ['Study', 'Study', undefined],
    ]);
  });

  it('keeps the shortcut once the title is gone, and names a tool drawn again', () => {
    document.body.innerHTML = TOOLS;
    syncEditorTools();
    syncEditorTools();
    expect(document.querySelector<HTMLElement>('a')?.dataset['lnExtTip']).toBe(
      'Analysis board (a)',
    );
    const study = document.querySelector('form');
    if (study) study.innerHTML = '<button data-icon="">Study</button>';
    syncEditorTools();
    expect(document.querySelector<HTMLElement>('form > button')?.dataset['lnExtTip']).toBe('Study');
  });
});
