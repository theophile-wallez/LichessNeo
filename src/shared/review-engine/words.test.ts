import { describe, expect, it } from 'vitest';
import { ENGLISH, engineWords, FRENCH } from './words.ts';

describe('engineWords', () => {
  it("picks the page's language", () => {
    expect(engineWords(true)).toBe(FRENCH);
    expect(engineWords(false)).toBe(ENGLISH);
  });

  it('says what a game was analysed with, by its depth and engine', () => {
    expect(ENGLISH.analysedAs(21, ENGLISH.kinds.light)).toBe('Analysed at depth 21 · light');
    expect(FRENCH.analysedAs(16, FRENCH.kinds.full)).toBe('Analysée en profondeur 16 · complet');
  });

  it('names the depth of a run and of a re-analysis, never its level', () => {
    expect(ENGLISH.running(12)).toBe('Analysing at depth 12');
    expect(ENGLISH.reanalyse(20)).toBe('Analyse again at depth 20');
    expect(ENGLISH.shiftTo(21)).toBe('Analyse at depth 21 instead');
    expect(FRENCH.running(12)).toBe('Analyse en profondeur 12');
    expect(FRENCH.reanalyse(20)).toBe('Réanalyser en profondeur 20');
    expect(FRENCH.shiftTo(21)).toBe('Analyser plutôt en profondeur 21');
    expect(ENGLISH.reanalyseWith(ENGLISH.kinds.full)).toBe('Analyse again with the full engine');
  });

  it('counts engines and threads in the singular and the plural', () => {
    expect(ENGLISH.layout(1, 1)).toBe('1 engine × 1 thread');
    expect(ENGLISH.layout(3, 2)).toBe('3 engines × 2 threads');
    expect(FRENCH.layout(2, 1)).toBe('2 moteurs × 1 thread');
    expect(FRENCH.left('5 s', 1)).toBe('Encore 5 s · 1 moteur');
  });

  it("tells the device's memory, and when it may be more", () => {
    expect(ENGLISH.device(8, 8)).toBe('8 cores · 8 GB or more');
    expect(ENGLISH.device(4, 4)).toBe('4 cores · 4 GB');
    expect(FRENCH.device(4, null)).toBe('4 cœurs · mémoire inconnue');
  });

  it('says why the cores moved with the engine', () => {
    expect(ENGLISH.coresMoved(1, 'full')).toBe(
      'Now on 1 core, as the full engine needs more memory.',
    );
    expect(FRENCH.coresMoved(2, 'light')).toBe(
      'Maintenant sur 2 cœurs, car le moteur léger demande moins de mémoire.',
    );
  });
});
