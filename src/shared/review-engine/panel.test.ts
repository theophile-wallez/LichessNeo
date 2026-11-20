import { beforeEach, describe, expect, it } from 'vitest';
import { stubDevice } from '#shared/testing/device.ts';
import { DEFAULT_REVIEW_ENGINE, type ReviewEngine } from './options.ts';
import { EnginePanel } from './panel.ts';
import type { PanelStatus } from './panel-view.ts';
import type { PositionState } from './progress-grid.ts';
import { ENGLISH } from './words.ts';

interface Built {
  readonly panel: EnginePanel;
  /** The settings handed to the owner, in order. */
  readonly changes: ReviewEngine[];
  readonly reanalyses: number[];
}

function build(page = false): Built {
  const changes: ReviewEngine[] = [];
  const reanalyses: number[] = [];
  const panel = new EnginePanel({
    page,
    words: ENGLISH,
    positions: 80,
    onChange: settings => changes.push(settings),
    onReanalyse: () => reanalyses.push(reanalyses.length),
  });
  // Out of the document, as a browser has it: the panel then changes at once, unanimated.
  Object.defineProperty(panel.element, 'offsetParent', { value: null });
  return { panel, changes, reanalyses };
}

function button(panel: EnginePanel, selector: string): HTMLButtonElement {
  const found = panel.element.querySelector(selector);
  if (!(found instanceof HTMLButtonElement)) throw new Error(`No button ${selector}`);
  return found;
}

const textOf = (panel: EnginePanel, name: string): string | null | undefined =>
  panel.element.querySelector(`[data-ln-ext-bind="${name}"]`)?.textContent;

/** The parts on show, by what reveals them. */
const shown = (panel: EnginePanel): string[] =>
  Array.from(panel.element.querySelectorAll('[data-ln-ext-when]'))
    .filter((part): part is HTMLElement => part instanceof HTMLElement && !part.hidden)
    .map(part => part.dataset.lnExtWhen ?? '');

const analysed = (depth: number): PanelStatus => ({
  analysed: { depth, engine: 'light' },
  running: null,
});

beforeEach(() => {
  stubDevice(8, 4);
  localStorage.clear();
});

describe('EnginePanel', () => {
  it('marks the default among the depths offered', () => {
    const { panel } = build();
    const stops = Array.from(panel.element.querySelectorAll('[data-ln-ext-stop]'));
    const defaults = stops.map(stop =>
      stop instanceof HTMLElement ? stop.dataset.lnExtDefault : '',
    );
    expect(defaults).toEqual(['false', 'true', 'false', 'false']);
  });

  it('shows the settings, the level picked lit', () => {
    const { panel } = build();
    panel.show({ ...DEFAULT_REVIEW_ENGINE, depth: 20 });
    expect(textOf(panel, 'depth')).toBe('20');
    expect(textOf(panel, 'tier')).toBe('Deep');
    expect(button(panel, '[data-ln-ext-stop="20"]').classList.contains('ln-ext-on')).toBe(true);
    expect(button(panel, '[data-ln-ext-stop="16"]').classList.contains('ln-ext-on')).toBe(false);
  });

  it('hands a depth picked to its owner', () => {
    const { panel, changes } = build();
    panel.show(DEFAULT_REVIEW_ENGINE);
    button(panel, '[data-ln-ext-stop="24"]').click();
    button(panel, '[data-ln-ext-act="deeper:1"]').click();
    expect(changes.map(settings => settings.depth)).toEqual([24, 25]);
    expect(textOf(panel, 'tier')).toBe('Custom · 25');
  });

  it('steps the depth down to 8 and up to 40, and no further', () => {
    const { panel } = build();
    panel.show({ ...DEFAULT_REVIEW_ENGINE, depth: 40 });
    expect(button(panel, '[data-ln-ext-act="deeper:1"]').disabled).toBe(true);
    expect(button(panel, '[data-ln-ext-act="deeper:-1"]').disabled).toBe(false);
    panel.show({ ...DEFAULT_REVIEW_ENGINE, depth: 8 });
    expect(button(panel, '[data-ln-ext-act="deeper:-1"]').disabled).toBe(true);
  });

  it('turns the reset on off the defaults, and puts them back', () => {
    const { panel, changes } = build();
    const reset = button(panel, '[data-ln-ext-act="reset"]');
    panel.show(DEFAULT_REVIEW_ENGINE);
    expect(reset.disabled).toBe(true);
    panel.show({ ...DEFAULT_REVIEW_ENGINE, hash: 64 });
    expect(reset.disabled).toBe(false);
    reset.click();
    expect(changes).toEqual([DEFAULT_REVIEW_ENGINE]);
    expect(reset.disabled).toBe(true);
  });

  it('follows the slider dragged', () => {
    const { panel, changes } = build();
    panel.show(DEFAULT_REVIEW_ENGINE);
    const range = panel.element.querySelector('input[data-ln-ext-input="depth"]');
    if (!(range instanceof HTMLInputElement)) throw new Error('No slider');
    expect(range.value).toBe('16');
    range.value = '22';
    range.dispatchEvent(new Event('input', { bubbles: true }));
    expect(changes.map(settings => settings.depth)).toEqual([22]);
    expect(textOf(panel, 'depth')).toBe('22');
  });

  it('reveals the re-analysis the settings call for, and runs it', () => {
    const { panel, reanalyses } = build();
    panel.show(DEFAULT_REVIEW_ENGINE, analysed(16));
    expect(shown(panel)).toEqual(['same']);
    panel.show({ ...DEFAULT_REVIEW_ENGINE, depth: 30 });
    expect(shown(panel)).toEqual(['past', 'raise']);
    button(panel, '.ln-ext-engine__primary').click();
    expect(reanalyses).toHaveLength(1);
  });

  it('says why the cores moved with the engine, until the next change', () => {
    const { panel, changes } = build();
    panel.show(DEFAULT_REVIEW_ENGINE);
    button(panel, '[data-ln-ext-act="engine:full"]').click();
    expect(changes.map(settings => settings.engine)).toEqual(['full']);
    expect(shown(panel)).toContain('toast');
    expect(textOf(panel, 'toast')).toBe('Now on 1 core, as the full engine needs more memory.');
    button(panel, '[data-ln-ext-stop="20"]').click();
    expect(shown(panel)).not.toContain('toast');
  });

  it('opens the advanced settings, and steps the threads', () => {
    const { panel, changes } = build();
    panel.show(DEFAULT_REVIEW_ENGINE);
    const disclosure = button(panel, '[data-ln-ext-act="advanced"]');
    disclosure.click();
    expect(disclosure.getAttribute('aria-expanded')).toBe('true');
    expect(shown(panel)).toContain('advanced');
    button(panel, '[data-ln-ext-act="threads:1"]').click();
    expect(changes.map(settings => settings.threads)).toEqual([2]);
  });

  it('draws the run going on into its grid', () => {
    const { panel } = build();
    panel.fill(Array.of<PositionState>('engine', 'cloud', 'busy'));
    expect(panel.element.querySelector('[data-ln-ext-grid]')?.children).toHaveLength(3);
  });
});

describe("the settings page's panel", () => {
  it("draws the device's cores, those taken lit", () => {
    const { panel, changes } = build(true);
    panel.show(DEFAULT_REVIEW_ENGINE);
    const chips = Array.from(panel.element.querySelectorAll('[data-ln-ext-core]'));
    expect(chips.map(chip => chip.classList.contains('ln-ext-on'))).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    button(panel, '[data-ln-ext-core="5"]').click();
    expect(changes.map(settings => settings.cores)).toEqual([5]);
    expect(shown(panel)).toContain('warn');
  });

  it("shows the engine's meters, and the curve without the default's mark", () => {
    const { panel } = build(true);
    const meters = (): string[] =>
      Array.from(panel.element.querySelectorAll('[data-ln-ext-kind-meters]'))
        .filter((part): part is HTMLElement => part instanceof HTMLElement && !part.hidden)
        .map(part => part.dataset.lnExtKindMeters ?? '');
    panel.show(DEFAULT_REVIEW_ENGINE);
    expect(meters()).toEqual(['light']);
    panel.show({ ...DEFAULT_REVIEW_ENGINE, engine: 'full' });
    expect(meters()).toEqual(['full']);
    expect(panel.element.querySelector('.ln-ext-engine-curve--big')).not.toBeNull();
    expect(panel.element.querySelector('.ln-ext-engine-curve__default')).toBeNull();
  });
});
