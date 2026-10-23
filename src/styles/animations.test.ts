import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// What Chrome's compositor animates by itself. Anything else an endless animation
// touches is restyled, and most often repainted, on the main thread at every frame,
// on every page the rule matches, for as long as it stays open.
const COMPOSITED = new Set(['opacity', 'transform', 'translate', 'rotate', 'scale']);

// Endless and not composited, each for a reason of its own.
const EXEMPT = new Set([
  // Racer's lanes: both of the track's pseudo-elements are taken. Only during a race.
  'ln-ext-racer-lane',
  // The road behind Racer's buttons: paused unless one is hovered.
  'ln-ext-racer-road',
  // Quick pairing's placeholders: only while the recent games load.
  'ln-ext-pairing-shimmer',
]);

const STYLES = import.meta.dirname;

// A style rule is a grouping rule too, for the rules nested in it.
function allRules(rules: CSSRuleList): CSSRule[] {
  const found: CSSRule[] = [];
  for (const rule of rules) {
    if (!(rule instanceof CSSGroupingRule) || rule instanceof CSSStyleRule) found.push(rule);
    if (rule instanceof CSSGroupingRule) found.push(...allRules(rule.cssRules));
  }
  return found;
}

function sheetRules(): CSSRule[] {
  const files = readdirSync(STYLES, { recursive: true, encoding: 'utf8' }).filter(file =>
    file.endsWith('.css'),
  );
  return files.flatMap(file => {
    const style = document.createElement('style');
    style.textContent = readFileSync(join(STYLES, file), 'utf8');
    document.head.append(style);
    return style.sheet ? allRules(style.sheet.cssRules) : [];
  });
}

function animatedProperties(keyframes: CSSKeyframesRule): Set<string> {
  return new Set(
    [...keyframes.cssRules].flatMap(frame => {
      if (!(frame instanceof CSSKeyframeRule)) return [];
      return Array.from({ length: frame.style.length }, (_, i) => frame.style.item(i));
    }),
  );
}

// happy-dom keeps the `animation` shorthand as written: its layers, split here, name
// our keyframes by their prefix.
function endlessNames(rule: CSSStyleRule): string[] {
  return rule.style
    .getPropertyValue('animation')
    .split(',')
    .map(layer => layer.trim().split(/\s+/))
    .filter(words => words.includes('infinite'))
    .flatMap(words => words.filter(word => word.startsWith('ln-ext-')));
}

afterEach(() => {
  document.head.replaceChildren();
});

describe('the stylesheets’ endless animations', () => {
  it('animate only what the compositor runs', () => {
    const rules = sheetRules();
    const keyframes = new Map(
      rules
        .filter(rule => rule instanceof CSSKeyframesRule)
        .map(rule => [rule.name, animatedProperties(rule)]),
    );
    const endless = new Set(
      rules.filter(rule => rule instanceof CSSStyleRule).flatMap(rule => endlessNames(rule)),
    );
    const offending = [...endless]
      .filter(name => !EXEMPT.has(name))
      .map(name => ({
        name,
        properties: [...(keyframes.get(name) ?? [])].filter(property => !COMPOSITED.has(property)),
      }))
      .filter(({ properties }) => properties.length > 0);

    expect(endless.size).toBeGreaterThan(10);
    expect([...endless].filter(name => !keyframes.has(name))).toEqual([]);
    expect(offending).toEqual([]);
  });
});
