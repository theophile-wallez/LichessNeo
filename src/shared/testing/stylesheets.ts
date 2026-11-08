// Stylesheets parsed by happy-dom, for tests that hold the whole of them to a rule.

// A style rule is a grouping rule too, for the rules nested in it.
function allRules(rules: CSSRuleList): CSSRule[] {
  const found: CSSRule[] = [];
  for (const rule of rules) {
    if (!(rule instanceof CSSGroupingRule) || rule instanceof CSSStyleRule) found.push(rule);
    if (rule instanceof CSSGroupingRule) found.push(...allRules(rule.cssRules));
  }
  return found;
}

/** The rules of `css`, nested ones included, its sheet appended to the document's head. */
export function cssRules(css: string): CSSRule[] {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  return style.sheet ? allRules(style.sheet.cssRules) : [];
}

/** A selector list's selectors, split at its own commas, not those inside `:is()` and the like. */
export function selectorsOf(selectorText: string): string[] {
  const selectors: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < selectorText.length; i++) {
    const character = selectorText[i];
    if (character === '(') depth++;
    else if (character === ')') depth--;
    else if (character === ',' && depth === 0) {
      selectors.push(selectorText.slice(start, i));
      start = i + 1;
    }
  }
  selectors.push(selectorText.slice(start));
  return selectors.map(selector => selector.replaceAll(/\s+/gu, ' ').trim());
}
