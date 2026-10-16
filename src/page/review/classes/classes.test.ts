import { describe, expect, it } from 'vitest';
import {
  CLASS_COLORS,
  classMood,
  COUNTED,
  GOOD,
  GRAPH_DOTS,
  isError,
  LIST_BADGES,
  MOVE_CLASSES,
  RANK,
  SUMMARY_ROWS,
} from './classes.ts';
import { classIcon, classImage, classSvg } from './icon-svg.ts';
// The original script's class table and sets, with our own colors and icons.
import legacy from './fixtures/legacy.json' with { type: 'json' };

describe('move classes', () => {
  it('come in the original’s order, in the fixture’s colors', () => {
    expect(MOVE_CLASSES).toEqual(legacy.classes.map(({ key }) => key));
    for (const { key, color } of legacy.classes) {
      const moveClass = MOVE_CLASSES.find(candidate => candidate === key);
      expect(moveClass && CLASS_COLORS[moveClass]).toBe(color);
    }
  });

  it('draw the fixture’s icons, inline and as a CSS image', () => {
    for (const { key, svg, img } of legacy.classes) {
      const moveClass = MOVE_CLASSES.find(candidate => candidate === key);
      if (!moveClass) throw new Error(`unknown class ${key}`);
      expect(classSvg(moveClass).value).toBe(svg);
      expect(classImage(moveClass)).toBe(img);
      expect(classIcon(moveClass).value).toBe(`<span class="lr-ext-cls-icon">${svg}</span>`);
    }
  });

  it('draw a glyph in the class’s color over a tint of it', () => {
    for (const moveClass of MOVE_CLASSES) {
      const color = CLASS_COLORS[moveClass];
      const svg = new DOMParser().parseFromString(classSvg(moveClass).value, 'image/svg+xml');
      const [tint, glyph, ...rest] = [...svg.documentElement.children];
      expect(rest).toEqual([]);
      expect(tint?.tagName).toBe('rect');
      expect(tint?.getAttribute('fill')).toBe(color);
      expect(Number(tint?.getAttribute('fill-opacity'))).toBeLessThan(0.5);
      expect(glyph?.getAttribute('stroke')).toBe(color);
      const paths = [...(glyph?.children ?? [])];
      expect(paths.length).toBeGreaterThan(0);
      // Strokes leave the fill unset, solid shapes fill in the color.
      const fills = new Set(paths.map(path => path.getAttribute('fill') ?? color));
      expect([...fills]).toEqual([color]);
    }
  });

  it('give each class a glyph of its own', () => {
    const glyphs = MOVE_CLASSES.map(moveClass =>
      classSvg(moveClass).value.replace(CLASS_COLORS[moveClass], ''),
    );
    expect(new Set(glyphs).size).toBe(MOVE_CLASSES.length);
  });

  it('keep the original’s sets', () => {
    const { sets } = legacy;
    expect(COUNTED).toEqual(sets.COUNTED);
    expect([...SUMMARY_ROWS]).toEqual(sets.SUMMARY_ROWS);
    expect([...GRAPH_DOTS]).toEqual(sets.GRAPH_DOTS);
    expect([...LIST_BADGES]).toEqual(sets.LIST_BADGES);
    expect([...GOOD]).toEqual(sets.GOOD);
    expect(RANK).toEqual(sets.RANK);
    const moods = Object.fromEntries(
      MOVE_CLASSES.flatMap(moveClass => {
        const mood = classMood(moveClass);
        return mood ? [[moveClass, mood]] : [];
      }),
    );
    // A missed chance makes the coach sad, where the original's worried, and a blunder angry,
    // where it was shocked.
    expect(moods).toEqual({ ...sets.MOODS, miss: 'sad', blunder: 'angry' });
  });

  it('tell the errors apart', () => {
    expect(MOVE_CLASSES.filter(isError)).toEqual(['inaccuracy', 'mistake', 'miss', 'blunder']);
  });
});
