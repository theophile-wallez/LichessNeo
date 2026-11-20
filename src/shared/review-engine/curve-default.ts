import { createSvgElement, setAttributes } from '#shared/svg.ts';

// The popover's mark of the depth the settings start at: a dashed line down the
// curve, named at its top, so that any depth picked is seen against it.

export interface DefaultMark {
  readonly line: SVGLineElement;
  readonly name: SVGTextElement;
}

export function buildDefaultMark(svg: SVGSVGElement, name: string): DefaultMark {
  const group = createSvgElement('g', { class: 'ln-ext-engine-curve__default' });
  const line = createSvgElement('line', { y1: 1 });
  const label = createSvgElement('text', { y: 8 });
  label.textContent = name;
  group.append(line, label);
  svg.append(group);
  return { line, name: label };
}

/** Puts the mark at `x`, down to the curve's `bottom`. */
export function drawDefaultMark(mark: DefaultMark, x: number, bottom: number): void {
  setAttributes(mark.line, { x1: x, x2: x, y2: bottom });
  mark.name.setAttribute('x', String(x + 5));
}
