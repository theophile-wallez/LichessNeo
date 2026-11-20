import { beforeEach, describe, expect, it } from 'vitest';
import { stubDevice } from '#shared/testing/device.ts';
import { type Analysed, DEFAULT_REVIEW_ENGINE, type ReviewEngine } from './options.ts';
import { type PanelStatus, panelView, type PanelView } from './panel-view.ts';
import { ENGLISH, FRENCH } from './words.ts';

const viewOf = (
  options: Partial<ReviewEngine>,
  status: PanelStatus | null = null,
  words = ENGLISH,
): PanelView =>
  panelView({
    options: { ...DEFAULT_REVIEW_ENGINE, ...options },
    words,
    positions: 80,
    status,
    toast: null,
    advanced: false,
  });

const analysed = (depth: number, engine: Analysed['engine'] = 'light'): PanelStatus => ({
  analysed: { depth, engine },
  running: null,
});

const running = (depth: number, done = 10, total = 40): PanelStatus => ({
  analysed: null,
  running: { done, total, analysed: { depth, engine: 'light' } },
});

const VERDICTS = ['raise', 'shift', 'lower', 'running', 'same'] as const;

/** The verdicts that hold, by name. */
const verdictOf = (view: PanelView): string[] => VERDICTS.filter(name => view.when[name] ?? false);

beforeEach(() => {
  stubDevice(8, 8);
  localStorage.clear();
});

describe('the verdict', () => {
  it('has none without a game', () => {
    expect(verdictOf(viewOf({}))).toEqual([]);
  });

  it('is up to date for the settings the game was analysed with', () => {
    expect(verdictOf(viewOf({}, analysed(16)))).toEqual(['same']);
  });

  it('offers a re-analysis for deeper settings or another engine', () => {
    const deeper = viewOf({ depth: 21 }, analysed(16));
    expect(verdictOf(deeper)).toEqual(['raise']);
    expect(deeper.text.reanalyse).toBe('Analyse again at depth 21');
    const full = viewOf({ engine: 'full' }, analysed(16));
    expect(verdictOf(full)).toEqual(['raise']);
    expect(full.text.reanalyse).toBe('Analyse again with the full engine');
  });

  it('keeps a finer analysis for shallower settings', () => {
    expect(verdictOf(viewOf({ depth: 12 }, analysed(20)))).toEqual(['lower']);
    expect(verdictOf(viewOf({}, analysed(16, 'full')))).toEqual(['lower']);
  });

  it('shows a run going on, and offers to switch it to other settings', () => {
    expect(verdictOf(viewOf({ depth: 12 }, running(12)))).toEqual(['running']);
    const shift = viewOf({ depth: 21 }, running(12));
    expect(verdictOf(shift)).toEqual(['shift', 'running']);
    expect(shift.text.shift).toBe('Analyse at depth 21 instead');
    expect(verdictOf(viewOf({ depth: 8 }, running(12)))).toEqual(['shift', 'running']);
  });

  it('judges against the run going on, not the records it replaces', () => {
    const status: PanelStatus = { ...running(12), analysed: { depth: 20, engine: 'light' } };
    const view = viewOf({ depth: 12 }, status);
    expect(verdictOf(view)).toEqual(['running']);
    expect(view.text.analysed).toBe('Analysed at depth 20 · light');
  });
});

describe('the texts', () => {
  it("say a run's depth and how far it went", () => {
    const view = viewOf({ depth: 21 }, running(12, 10, 40));
    expect(view.text.running).toBe('Analysing at depth 12');
    expect(view.text.percent).toBe('25');
    expect(view.text.left).toMatch(/ left · 3 engines$/u);
    expect(viewOf({}).text.running).toBe('');
  });

  it("name the level, or the user's own depth", () => {
    expect(viewOf({ depth: 20 })).toMatchObject({ hue: 'purple', text: { tier: 'Deep' } });
    expect(viewOf({ depth: 21 })).toMatchObject({ hue: 'orange', text: { tier: 'Custom · 21' } });
    expect(viewOf({ depth: 21 }, null, FRENCH).text.tier).toBe('Perso · 21');
  });

  it('say what the game was analysed with, in the language asked', () => {
    expect(viewOf({}, analysed(21)).text.analysed).toBe('Analysed at depth 21 · light');
    expect(viewOf({}, analysed(16, 'full'), FRENCH).text.analysed).toBe(
      'Analysée en profondeur 16 · complet',
    );
  });

  it('count the memory the engines take', () => {
    expect(viewOf({}).text.total).toBe('In all: 3 engines × 1 thread · about 340 MB of memory');
  });
});

describe('the parts shown', () => {
  it('warns past the cores suggested, and past the curve', () => {
    expect(viewOf({}).when).toMatchObject({ warn: false, past: false, light: true, full: false });
    expect(viewOf({ cores: 5, depth: 30, engine: 'full' }).when).toMatchObject({
      warn: true,
      past: true,
      light: false,
      full: true,
    });
  });

  it('marks the fields off their default', () => {
    expect(Object.values(viewOf({}).mods).some(Boolean)).toBe(false);
    expect(viewOf({ depth: 21, cores: 3, cap: 5 }).mods).toEqual({
      depth: true,
      engine: false,
      cores: true,
      threads: false,
      hash: false,
      cap: true,
    });
  });

  it("draws the curve from depth 8 to 28, with each level's time", () => {
    const { curve } = viewOf({ depth: 20 });
    expect(curve.main).toHaveLength(21);
    expect(curve.other).toHaveLength(21);
    expect(curve.main.every((value, i) => i === 0 || value >= (curve.main[i - 1] ?? 0))).toBe(true);
    expect(curve.stops.map(stop => stop.name)).toEqual(['Fast', 'Standard', 'Deep', 'Maximum']);
    expect(curve.tier).toBe('deep');
  });
});
